"""Seed demo organizations, users, and portfolio data."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.db.models import Organization, OrganizationType, PortfolioLink, User, UserRole


def seed_platform_data(db: Session) -> None:
    if db.scalar(select(Organization).limit(1)):
        return

    idbi = Organization(
        name="IDBI Bank — MSME Lending",
        org_type=OrganizationType.BANK,
        registration_id="BANK-IDBI-001",
    )
    db.add(idbi)
    db.flush()

    shree_ganesh = Organization(
        name="Shree Ganesh Auto Components Pvt Ltd",
        org_type=OrganizationType.MSME,
        registration_id="UDYAM-MH-12-0012345",
    )
    green_fab = Organization(
        name="GreenFab Textiles LLP",
        org_type=OrganizationType.MSME,
        registration_id="UDYAM-GJ-24-0098765",
    )
    db.add_all([shree_ganesh, green_fab])
    db.flush()

    bank_password = hash_password("IDBI@2026")
    msme_password = hash_password("MSME@2026")

    bank_users = [
        User(
            email="admin@idbi.bank.in",
            password_hash=bank_password,
            full_name="Priya Sharma",
            role=UserRole.BANK_ADMIN,
            organization_id=idbi.id,
        ),
        User(
            email="credit@idbi.bank.in",
            password_hash=bank_password,
            full_name="Amit Verma",
            role=UserRole.BANK_CREDIT,
            organization_id=idbi.id,
        ),
        User(
            email="risk@idbi.bank.in",
            password_hash=bank_password,
            full_name="Neha Kapoor",
            role=UserRole.BANK_RISK,
            organization_id=idbi.id,
        ),
        User(
            email="rm@idbi.bank.in",
            password_hash=bank_password,
            full_name="Rahul Mehta",
            role=UserRole.BANK_RM,
            organization_id=idbi.id,
        ),
    ]
    msme_users = [
        User(
            email="rajesh@shreeganesh.in",
            password_hash=msme_password,
            full_name="Rajesh Patil",
            role=UserRole.MSME_OWNER,
            organization_id=shree_ganesh.id,
            msme_id="msme-demo-001",
        ),
        User(
            email="accounts@shreeganesh.in",
            password_hash=msme_password,
            full_name="Sunita Patil",
            role=UserRole.MSME_VIEWER,
            organization_id=shree_ganesh.id,
            msme_id="msme-demo-001",
        ),
        User(
            email="founder@greenfab.in",
            password_hash=msme_password,
            full_name="Anita Desai",
            role=UserRole.MSME_OWNER,
            organization_id=green_fab.id,
            msme_id="msme-greenfab-002",
        ),
    ]
    db.add_all(bank_users + msme_users)

    portfolio = [
        PortfolioLink(
            bank_org_id=idbi.id,
            msme_id="msme-demo-001",
            business_name="Shree Ganesh Auto Components Pvt Ltd",
            sector="auto_components",
            gstin="27AABCS1234F1Z5",
            relationship_manager="Rahul Mehta",
            credit_limit_inr=15_000_000,
        ),
        PortfolioLink(
            bank_org_id=idbi.id,
            msme_id="msme-greenfab-002",
            business_name="GreenFab Textiles LLP",
            sector="textiles",
            gstin="24AABCG5678H1Z2",
            relationship_manager="Rahul Mehta",
            credit_limit_inr=8_000_000,
        ),
        PortfolioLink(
            bank_org_id=idbi.id,
            msme_id="msme-techparts-003",
            business_name="TechParts Engineering Works",
            sector="manufacturing",
            gstin="29AABCT9012K1Z8",
            relationship_manager="Amit Verma",
            credit_limit_inr=5_000_000,
        ),
    ]
    db.add_all(portfolio)
    db.commit()
