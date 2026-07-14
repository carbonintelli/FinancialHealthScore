"""Loan application workflow."""

from __future__ import annotations

import secrets
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db.models import LoanApplication, LoanStatus, Notification, User, utc_now
from app.models.platform_schemas import LoanApplicationCreate


def _ref() -> str:
    return f"LN-{utc_now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"


def create_loan_application(
    db: Session,
    user: User,
    business_name: str,
    bank_org_id: int,
    payload: LoanApplicationCreate,
) -> LoanApplication:
    app = LoanApplication(
        application_ref=_ref(),
        msme_id=user.msme_id or "unknown",
        business_name=business_name,
        bank_org_id=bank_org_id,
        submitted_by_user_id=user.id,
        assessment_id=payload.assessment_id,
        loan_type=payload.loan_type,
        amount_inr=payload.amount_inr,
        tenure_months=payload.tenure_months,
        purpose=payload.purpose,
        status=LoanStatus.SUBMITTED,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def list_loans_for_msme(db: Session, msme_id: str) -> list[LoanApplication]:
    return list(
        db.scalars(
            select(LoanApplication)
            .where(LoanApplication.msme_id == msme_id)
            .order_by(desc(LoanApplication.created_at))
        )
    )


def list_loans_for_bank(db: Session, bank_org_id: int, status: LoanStatus | None = None) -> list[LoanApplication]:
    q = select(LoanApplication).where(LoanApplication.bank_org_id == bank_org_id)
    if status:
        q = q.where(LoanApplication.status == status)
    return list(db.scalars(q.order_by(desc(LoanApplication.created_at))))


def update_loan_status(
    db: Session,
    loan_id: int,
    status: LoanStatus,
    reviewer_notes: str | None,
    notify_user_id: int,
) -> LoanApplication:
    loan = db.get(LoanApplication, loan_id)
    if loan is None:
        raise ValueError("Loan not found")
    loan.status = status
    loan.reviewer_notes = reviewer_notes
    loan.updated_at = utc_now()
    db.add(
        Notification(
            user_id=notify_user_id,
            title=f"Loan {loan.application_ref} — {status.value.replace('_', ' ').title()}",
            message=reviewer_notes or f"Your loan application status is now {status.value}.",
            category="loan",
        )
    )
    db.commit()
    db.refresh(loan)
    return loan


def pending_loan_count(db: Session, bank_org_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(LoanApplication)
        .where(
            LoanApplication.bank_org_id == bank_org_id,
            LoanApplication.status.in_([LoanStatus.SUBMITTED, LoanStatus.UNDER_REVIEW]),
        )
    ) or 0


def approved_loans_total(db: Session, bank_org_id: int) -> float:
    return db.scalar(
        select(func.coalesce(func.sum(LoanApplication.amount_inr), 0.0)).where(
            LoanApplication.bank_org_id == bank_org_id,
            LoanApplication.status.in_([LoanStatus.APPROVED, LoanStatus.DISBURSED]),
        )
    ) or 0.0


def open_loan_count_for_msme(db: Session, msme_id: str) -> int:
    return db.scalar(
        select(func.count())
        .select_from(LoanApplication)
        .where(
            LoanApplication.msme_id == msme_id,
            LoanApplication.status.in_([LoanStatus.SUBMITTED, LoanStatus.UNDER_REVIEW, LoanStatus.DRAFT]),
        )
    ) or 0
