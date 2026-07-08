"""SQLAlchemy ORM models for platform users, portfolios, and assessments."""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class OrganizationType(str, enum.Enum):
    BANK = "bank"
    MSME = "msme"


class UserRole(str, enum.Enum):
    BANK_ADMIN = "bank_admin"
    BANK_CREDIT = "bank_credit"
    BANK_RISK = "bank_risk"
    BANK_RM = "bank_rm"
    MSME_OWNER = "msme_owner"
    MSME_VIEWER = "msme_viewer"


class LoanStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISBURSED = "disbursed"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    org_type: Mapped[OrganizationType] = mapped_column(Enum(OrganizationType), nullable=False)
    registration_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    portfolio_links: Mapped[list["PortfolioLink"]] = relationship(back_populates="bank_org")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    msme_id: Mapped[str | None] = mapped_column(String(64), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    organization: Mapped["Organization"] = relationship(back_populates="users")


class PortfolioLink(Base):
    """Links MSMEs to a bank's lending portfolio."""

    __tablename__ = "portfolio_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bank_org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    msme_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sector: Mapped[str] = mapped_column(String(64), default="general")
    gstin: Mapped[str | None] = mapped_column(String(20))
    relationship_manager: Mapped[str | None] = mapped_column(String(255))
    credit_limit_inr: Mapped[float | None] = mapped_column(Float)
    onboarded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bank_org: Mapped["Organization"] = relationship(back_populates="portfolio_links")


class AssessmentRecord(Base):
    __tablename__ = "assessment_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    assessment_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    msme_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    audience: Mapped[str] = mapped_column(String(32), default="credit_team")
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str] = mapped_column(String(8), nullable=False)
    overall_risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    result_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_ref: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    msme_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bank_org_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    submitted_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assessment_id: Mapped[str | None] = mapped_column(String(64))
    loan_type: Mapped[str] = mapped_column(String(64), default="working_capital")
    amount_inr: Mapped[float] = mapped_column(Float, nullable=False)
    tenure_months: Mapped[int] = mapped_column(Integer, default=36)
    purpose: Mapped[str | None] = mapped_column(Text)
    status: Mapped[LoanStatus] = mapped_column(Enum(LoanStatus), default=LoanStatus.SUBMITTED)
    reviewer_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(32), default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
