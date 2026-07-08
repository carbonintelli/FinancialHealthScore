"""Detailed assessment report endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.models import User, UserRole
from app.db.session import get_db
from app.models.platform_schemas import DetailedReportResponse
from app.models.schemas import FinancialHealthScoreResult
from app.services.assessment_store import get_assessment
from app.services.portfolio_service import bank_has_msme
from app.services.report_service import build_detailed_report, render_html_report

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


def _can_access_report(user: User, msme_id: str, db: Session) -> bool:
    if user.role in {UserRole.MSME_OWNER, UserRole.MSME_VIEWER}:
        return user.msme_id == msme_id
    if user.role in {UserRole.BANK_ADMIN, UserRole.BANK_CREDIT, UserRole.BANK_RISK, UserRole.BANK_RM}:
        return bank_has_msme(db, user.organization_id, msme_id)
    return False


def _load_result(db: Session, assessment_id: str, user: User) -> FinancialHealthScoreResult:
    record = get_assessment(db, assessment_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if not _can_access_report(user, record.msme_id, db):
        raise HTTPException(status_code=403, detail="Access denied to this report")
    return FinancialHealthScoreResult.model_validate(record.result_json)


@router.get("/{assessment_id}", response_model=DetailedReportResponse)
def get_detailed_report(assessment_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = _load_result(db, assessment_id, user)
    return DetailedReportResponse(**build_detailed_report(result))


@router.get("/{assessment_id}/html", response_class=HTMLResponse)
def get_html_report(assessment_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = _load_result(db, assessment_id, user)
    return HTMLResponse(content=render_html_report(result))
