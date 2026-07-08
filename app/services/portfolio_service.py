"""Portfolio management for bank users."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import PortfolioLink
from app.models.platform_schemas import PortfolioItem
from app.services.assessment_store import latest_assessment_by_msme


def get_bank_portfolio(db: Session, bank_org_id: int) -> list[PortfolioItem]:
    links = list(
        db.scalars(select(PortfolioLink).where(PortfolioLink.bank_org_id == bank_org_id).order_by(PortfolioLink.business_name))
    )
    items: list[PortfolioItem] = []
    for link in links:
        latest = latest_assessment_by_msme(db, link.msme_id)
        items.append(
            PortfolioItem(
                msme_id=link.msme_id,
                business_name=link.business_name,
                sector=link.sector,
                gstin=link.gstin,
                relationship_manager=link.relationship_manager,
                credit_limit_inr=link.credit_limit_inr,
                latest_score=latest.overall_score if latest else None,
                latest_grade=latest.grade if latest else None,
                latest_risk_level=latest.overall_risk_level if latest else None,
                last_assessed_at=latest.created_at if latest else None,
            )
        )
    return items


def get_portfolio_msme_ids(db: Session, bank_org_id: int) -> list[str]:
    return list(
        db.scalars(
            select(PortfolioLink.msme_id).where(PortfolioLink.bank_org_id == bank_org_id)
        )
    )


def bank_has_msme(db: Session, bank_org_id: int, msme_id: str) -> bool:
    return db.scalar(
        select(PortfolioLink.id).where(
            PortfolioLink.bank_org_id == bank_org_id,
            PortfolioLink.msme_id == msme_id,
        )
    ) is not None
