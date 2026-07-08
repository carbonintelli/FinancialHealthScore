"""Bank and MSME platform API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_bank_user, require_msme_user
from app.db.models import LoanApplication, LoanStatus, Organization, User, UserRole
from app.db.session import get_db
from app.models.platform_schemas import (
    AssessmentSummary,
    BankDashboardStats,
    LoanApplicationCreate,
    LoanApplicationResponse,
    LoanStatusUpdate,
    MSMEDashboardStats,
    NotificationResponse,
    PortfolioItem,
)
from app.models.schemas import AssessmentRequest, AudienceRole, FinancialHealthScoreResult
from app.services.assessment_runner import run_assessment, run_demo_assessment_for_msme
from app.services.assessment_store import (
    bank_dashboard_metrics,
    list_assessments_for_bank,
    list_assessments_for_msme,
    latest_assessment_by_msme,
    save_assessment,
)
from app.services.loan_service import (
    approved_loans_total,
    create_loan_application,
    list_loans_for_bank,
    list_loans_for_msme,
    open_loan_count_for_msme,
    pending_loan_count,
    update_loan_status,
)
from app.services.notification_service import list_notifications, mark_read, unread_count
from app.services.portfolio_service import bank_has_msme, get_bank_portfolio, get_portfolio_msme_ids

router = APIRouter(prefix="/api/v1", tags=["Platform"])


def _audience_for_bank_role(role: UserRole) -> AudienceRole:
    mapping = {
        UserRole.BANK_CREDIT: AudienceRole.CREDIT_TEAM,
        UserRole.BANK_RISK: AudienceRole.RISK_TEAM,
        UserRole.BANK_RM: AudienceRole.RELATIONSHIP_MANAGER,
        UserRole.BANK_ADMIN: AudienceRole.CREDIT_TEAM,
    }
    return mapping.get(role, AudienceRole.CREDIT_TEAM)


def _to_summary(record) -> AssessmentSummary:
    return AssessmentSummary(
        assessment_id=record.assessment_id,
        msme_id=record.msme_id,
        business_name=record.business_name,
        overall_score=record.overall_score,
        grade=record.grade,
        overall_risk_level=record.overall_risk_level,
        audience=record.audience,
        created_at=record.created_at,
    )


@router.get("/bank/dashboard", response_model=BankDashboardStats)
def bank_dashboard(user: User = Depends(require_bank_user), db: Session = Depends(get_db)):
    msme_ids = get_portfolio_msme_ids(db, user.organization_id)
    portfolio = get_bank_portfolio(db, user.organization_id)
    metrics = bank_dashboard_metrics(db, msme_ids)
    return BankDashboardStats(
        portfolio_count=len(portfolio),
        assessments_this_month=metrics["assessments_this_month"],
        average_score=metrics["average_score"],
        high_risk_count=metrics["high_risk_count"],
        pending_loans=pending_loan_count(db, user.organization_id),
        approved_loans_inr=approved_loans_total(db, user.organization_id),
    )


@router.get("/bank/portfolio", response_model=list[PortfolioItem])
def bank_portfolio(user: User = Depends(require_bank_user), db: Session = Depends(get_db)):
    return get_bank_portfolio(db, user.organization_id)


@router.get("/bank/assessments", response_model=list[AssessmentSummary])
def bank_assessments(user: User = Depends(require_bank_user), db: Session = Depends(get_db)):
    msme_ids = get_portfolio_msme_ids(db, user.organization_id)
    return [_to_summary(r) for r in list_assessments_for_bank(db, msme_ids)]


@router.post("/bank/assess/{msme_id}", response_model=FinancialHealthScoreResult)
async def bank_run_assessment(
    msme_id: str,
    audience: AudienceRole | None = Query(None),
    user: User = Depends(require_bank_user),
    db: Session = Depends(get_db),
):
    if not bank_has_msme(db, user.organization_id, msme_id):
        raise HTTPException(status_code=404, detail="MSME not in bank portfolio")

    aud = audience or _audience_for_bank_role(user.role)
    result = await run_demo_assessment_for_msme(msme_id, aud)
    save_assessment(db, user, result, aud.value)
    return result


@router.get("/bank/loans", response_model=list[LoanApplicationResponse])
def bank_loans(
    status: LoanStatus | None = None,
    user: User = Depends(require_bank_user),
    db: Session = Depends(get_db),
):
    return list_loans_for_bank(db, user.organization_id, status)


@router.patch("/bank/loans/{loan_id}", response_model=LoanApplicationResponse)
def bank_update_loan(
    loan_id: int,
    payload: LoanStatusUpdate,
    user: User = Depends(require_bank_user),
    db: Session = Depends(get_db),
):
    loan = db.get(LoanApplication, loan_id)
    if loan is None or loan.bank_org_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Loan not found")
    try:
        updated = update_loan_status(db, loan_id, payload.status, payload.reviewer_notes, loan.submitted_by_user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return updated


@router.get("/msme/dashboard", response_model=MSMEDashboardStats)
def msme_dashboard(user: User = Depends(require_msme_user), db: Session = Depends(get_db)):
    if not user.msme_id:
        raise HTTPException(status_code=400, detail="MSME profile not linked")
    org = db.get(Organization, user.organization_id)
    latest = latest_assessment_by_msme(db, user.msme_id)
    improvements = len(latest.result_json.get("recommended_improvements", [])) if latest else 0
    return MSMEDashboardStats(
        msme_id=user.msme_id,
        business_name=org.name if org else "MSME",
        latest_score=latest.overall_score if latest else None,
        latest_grade=latest.grade if latest else None,
        latest_risk_level=latest.overall_risk_level if latest else None,
        last_assessed_at=latest.created_at if latest else None,
        open_loan_applications=open_loan_count_for_msme(db, user.msme_id),
        unread_notifications=unread_count(db, user.id),
        improvement_count=improvements,
    )


@router.get("/msme/assessments", response_model=list[AssessmentSummary])
def msme_assessments(user: User = Depends(require_msme_user), db: Session = Depends(get_db)):
    if not user.msme_id:
        raise HTTPException(status_code=400, detail="MSME profile not linked")
    return [_to_summary(r) for r in list_assessments_for_msme(db, user.msme_id)]


@router.post("/msme/assess", response_model=FinancialHealthScoreResult)
async def msme_run_assessment(
    request: AssessmentRequest,
    user: User = Depends(require_msme_user),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.MSME_VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot run assessments")
    if user.msme_id:
        request.financial_data.profile.msme_id = user.msme_id
    result = await run_assessment(request)
    save_assessment(db, user, result, request.audience.value)
    return result


@router.post("/msme/assess/quick", response_model=FinancialHealthScoreResult)
async def msme_quick_assessment(
    user: User = Depends(require_msme_user),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.MSME_VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot run assessments")
    if not user.msme_id:
        raise HTTPException(status_code=400, detail="MSME profile not linked")
    result = await run_demo_assessment_for_msme(user.msme_id, AudienceRole.CREDIT_TEAM)
    save_assessment(db, user, result, AudienceRole.CREDIT_TEAM.value)
    return result


@router.post("/msme/loans", response_model=LoanApplicationResponse, status_code=201)
def msme_submit_loan(
    payload: LoanApplicationCreate,
    user: User = Depends(require_msme_user),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.MSME_VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot submit loans")
    org = db.get(Organization, user.organization_id)
    idbi = db.scalar(select(Organization).where(Organization.registration_id == "BANK-IDBI-001"))
    if idbi is None:
        raise HTTPException(status_code=500, detail="Partner bank not configured")
    return create_loan_application(db, user, org.name if org else "MSME", idbi.id, payload)


@router.get("/msme/loans", response_model=list[LoanApplicationResponse])
def msme_loans(user: User = Depends(require_msme_user), db: Session = Depends(get_db)):
    if not user.msme_id:
        return []
    return list_loans_for_msme(db, user.msme_id)


@router.get("/notifications", response_model=list[NotificationResponse])
def get_notifications(
    unread_only: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_notifications(db, user.id, unread_only)


@router.patch("/notifications/{notification_id}/read", response_model=NotificationResponse)
def read_notification(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = mark_read(db, notification_id, user.id)
    if note is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    return note
