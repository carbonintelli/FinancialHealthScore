"""Persist and retrieve assessment records."""

from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db.models import AssessmentRecord, User
from app.models.schemas import FinancialHealthScoreResult


def save_assessment(db: Session, user: User, result: FinancialHealthScoreResult, audience: str) -> AssessmentRecord:
    record = AssessmentRecord(
        assessment_id=result.assessment_id,
        msme_id=result.msme_id or user.msme_id or "unknown",
        business_name=result.business_name,
        requested_by_user_id=user.id,
        audience=audience,
        overall_score=result.overall_score,
        grade=result.grade,
        overall_risk_level=result.overall_risk_level.value
        if hasattr(result.overall_risk_level, "value")
        else str(result.overall_risk_level),
        result_json=result.model_dump(mode="json"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_assessment(db: Session, assessment_id: str) -> AssessmentRecord | None:
    return db.scalar(select(AssessmentRecord).where(AssessmentRecord.assessment_id == assessment_id))


def list_assessments_for_msme(db: Session, msme_id: str, limit: int = 20) -> list[AssessmentRecord]:
    return list(
        db.scalars(
            select(AssessmentRecord)
            .where(AssessmentRecord.msme_id == msme_id)
            .order_by(desc(AssessmentRecord.created_at))
            .limit(limit)
        )
    )


def list_assessments_for_bank(db: Session, msme_ids: list[str], limit: int = 50) -> list[AssessmentRecord]:
    if not msme_ids:
        return []
    return list(
        db.scalars(
            select(AssessmentRecord)
            .where(AssessmentRecord.msme_id.in_(msme_ids))
            .order_by(desc(AssessmentRecord.created_at))
            .limit(limit)
        )
    )


def latest_assessment_by_msme(db: Session, msme_id: str) -> AssessmentRecord | None:
    return db.scalar(
        select(AssessmentRecord)
        .where(AssessmentRecord.msme_id == msme_id)
        .order_by(desc(AssessmentRecord.created_at))
        .limit(1)
    )


def bank_dashboard_metrics(db: Session, msme_ids: list[str]) -> dict:
    if not msme_ids:
        return {"assessments_this_month": 0, "average_score": None, "high_risk_count": 0}

    from datetime import datetime, timedelta

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    recent = list(
        db.scalars(
            select(AssessmentRecord).where(
                AssessmentRecord.msme_id.in_(msme_ids),
                AssessmentRecord.created_at >= month_start,
            )
        )
    )
    latest_scores: list[float] = []
    high_risk = 0
    for mid in msme_ids:
        rec = latest_assessment_by_msme(db, mid)
        if rec:
            latest_scores.append(rec.overall_score)
            if rec.overall_risk_level in {"high", "critical", "elevated"}:
                high_risk += 1

    avg = sum(latest_scores) / len(latest_scores) if latest_scores else None
    return {
        "assessments_this_month": len(recent),
        "average_score": round(avg, 1) if avg is not None else None,
        "high_risk_count": high_risk,
    }


def count_assessments_since(db: Session, msme_id: str, since) -> int:
    return db.scalar(
        select(func.count())
        .select_from(AssessmentRecord)
        .where(AssessmentRecord.msme_id == msme_id, AssessmentRecord.created_at >= since)
    ) or 0
