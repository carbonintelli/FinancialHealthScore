from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    ELEVATED = "elevated"
    HIGH = "high"
    CRITICAL = "critical"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AudienceRole(str, Enum):
    CREDIT_TEAM = "credit_team"
    RISK_TEAM = "risk_team"
    RELATIONSHIP_MANAGER = "relationship_manager"
    PORTFOLIO_ANALYST = "portfolio_analyst"


class MonthlyCashFlow(BaseModel):
    month: str = Field(..., description="YYYY-MM format")
    inflows: float = Field(..., ge=0, description="Total cash inflows in INR")
    outflows: float = Field(..., ge=0, description="Total cash outflows in INR")


class UtilityBill(BaseModel):
    month: str
    electricity_kwh: float | None = Field(None, ge=0)
    electricity_cost_inr: float | None = Field(None, ge=0)
    fuel_litres: float | None = Field(None, ge=0)
    fuel_cost_inr: float | None = Field(None, ge=0)


class PaymentRecord(BaseModel):
    counterparty: str
    amount_inr: float = Field(..., ge=0)
    due_date: date
    paid_date: date | None = None
    status: str = Field(..., pattern="^(on_time|late|overdue|defaulted)$")


class AccountingSnapshot(BaseModel):
    revenue_inr: float = Field(..., ge=0, description="Annual or trailing-12M revenue")
    cost_of_goods_inr: float = Field(..., ge=0)
    operating_expenses_inr: float = Field(..., ge=0)
    current_assets_inr: float = Field(..., ge=0)
    current_liabilities_inr: float = Field(..., ge=0)
    total_debt_inr: float = Field(..., ge=0)
    equity_inr: float = Field(..., ge=0)
    net_profit_inr: float | None = None
    period_end: date | None = None


class MSMEProfile(BaseModel):
    msme_id: str | None = Field(None, description="Carbon Intelligence MSME ID for data enrichment")
    business_name: str
    udyam_number: str | None = None
    gstin: str | None = None
    sector: str = Field(..., description="e.g. manufacturing, services, trading")
    employee_count: int | None = Field(None, ge=1)
    years_in_operation: float | None = Field(None, ge=0)
    annual_turnover_inr: float | None = Field(None, ge=0)


class FinancialDataInput(BaseModel):
    profile: MSMEProfile
    accounting: AccountingSnapshot
    cash_flows: list[MonthlyCashFlow] = Field(default_factory=list, min_length=0)
    utility_bills: list[UtilityBill] = Field(default_factory=list)
    payment_records: list[PaymentRecord] = Field(default_factory=list)
    bank_statement_summary: dict[str, Any] | None = Field(
        None,
        description="Optional aggregated bank statement metrics",
    )


class AssessmentRequest(BaseModel):
    financial_data: FinancialDataInput
    include_carbon_intelligence: bool = Field(
        True,
        description="Fetch carbon intelligence from ci.sustainow.in when msme_id is provided",
    )
    audience: AudienceRole = Field(
        AudienceRole.CREDIT_TEAM,
        description="Tailor insight emphasis for the requesting team",
    )


class EvidenceInsight(BaseModel):
    indicator: str
    category: str
    value: str | float | int | None = None
    benchmark: str | float | int | None = None
    impact: str = Field(..., description="positive, neutral, or negative")
    narrative: str
    confidence: ConfidenceLevel
    data_source: str


class DimensionScore(BaseModel):
    dimension: str
    score: float = Field(..., ge=0, le=100)
    weight: float = Field(..., ge=0, le=1)
    risk_level: RiskLevel
    confidence: ConfidenceLevel
    insights: list[EvidenceInsight] = Field(default_factory=list)


class RiskIndicator(BaseModel):
    code: str
    label: str
    severity: RiskLevel
    description: str
    evidence: list[str] = Field(default_factory=list)
    recommended_action: str | None = None


class CarbonIntelligenceSummary(BaseModel):
    source: str = "ci.sustainow.in"
    msme_id: str | None = None
    total_emissions_tco2e: float | None = None
    scope1_tco2e: float | None = None
    scope2_tco2e: float | None = None
    scope3_tco2e: float | None = None
    carbon_intensity: float | None = None
    transition_risk_score: float | None = Field(None, ge=0, le=100)
    energy_cost_exposure_pct: float | None = None
    reporting_readiness: str | None = None
    data_freshness: str | None = None
    mock_data: bool = False


class FinancialHealthScoreResult(BaseModel):
    assessment_id: str
    business_name: str
    msme_id: str | None = None
    generated_at: datetime
    overall_score: float = Field(..., ge=0, le=100)
    overall_risk_level: RiskLevel
    overall_confidence: ConfidenceLevel
    grade: str = Field(..., description="A+ to D letter grade")
    dimension_scores: list[DimensionScore]
    risk_indicators: list[RiskIndicator]
    key_insights: list[str]
    green_finance_opportunities: list[str] = Field(default_factory=list)
    carbon_intelligence: CarbonIntelligenceSummary | None = None
    audience_summary: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    version: str
    carbon_intelligence_connected: bool
    mock_mode: bool


class IntegrationInfo(BaseModel):
    carbon_intelligence_base_url: str
    openapi_url: str
    partner_catalog_url: str
    description: str
