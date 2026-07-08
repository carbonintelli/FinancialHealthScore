"""Platform API schemas — auth, dashboard, loans, reports."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field

from app.db.models import LoanStatus, UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: "UserProfile"


class UserProfile(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    organization_id: int
    organization_name: str
    organization_type: str
    msme_id: str | None = None

    model_config = {"from_attributes": True}


class MSMERegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str
    business_name: str
    sector: str = "general"
    gstin: str | None = None
    udyam_number: str | None = None


class PortfolioItem(BaseModel):
    msme_id: str
    business_name: str
    sector: str
    gstin: str | None
    relationship_manager: str | None
    credit_limit_inr: float | None
    latest_score: float | None = None
    latest_grade: str | None = None
    latest_risk_level: str | None = None
    last_assessed_at: datetime | None = None


class BankDashboardStats(BaseModel):
    portfolio_count: int
    assessments_this_month: int
    average_score: float | None
    high_risk_count: int
    pending_loans: int
    approved_loans_inr: float


class MSMEDashboardStats(BaseModel):
    msme_id: str
    business_name: str
    latest_score: float | None
    latest_grade: str | None
    latest_risk_level: str | None
    last_assessed_at: datetime | None
    open_loan_applications: int
    unread_notifications: int
    improvement_count: int


class AssessmentSummary(BaseModel):
    assessment_id: str
    msme_id: str
    business_name: str
    overall_score: float
    grade: str
    overall_risk_level: str
    audience: str
    created_at: datetime


class LoanApplicationCreate(BaseModel):
    loan_type: str = "working_capital"
    amount_inr: float = Field(..., gt=0)
    tenure_months: int = Field(36, ge=6, le=120)
    purpose: str | None = None
    assessment_id: str | None = None


class LoanApplicationResponse(BaseModel):
    id: int
    application_ref: str
    msme_id: str
    business_name: str
    loan_type: str
    amount_inr: float
    tenure_months: int
    purpose: str | None
    status: LoanStatus
    assessment_id: str | None
    reviewer_notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoanStatusUpdate(BaseModel):
    status: LoanStatus
    reviewer_notes: str | None = None


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DetailedReportResponse(BaseModel):
    assessment_id: str
    business_name: str
    msme_id: str | None
    generated_at: datetime
    report_title: str
    executive_summary: str
    overall_score: float
    grade: str
    overall_risk_level: str
    dimension_scores: list[dict[str, Any]]
    risk_indicators: list[dict[str, Any]]
    key_insights: list[str]
    data_gaps: list[dict[str, Any]]
    recommended_improvements: list[str]
    green_finance_opportunities: list[str]
    government_policy_assessment: dict[str, Any] | None
    advanced_intelligence: dict[str, Any] | None
    carbon_intelligence: dict[str, Any] | None
    audience_summary: str
    credit_decision_recommendation: str
    metadata: dict[str, Any]
    html_report_url: str


class DemoCredentials(BaseModel):
    bank: list[dict[str, str]]
    msme: list[dict[str, str]]
