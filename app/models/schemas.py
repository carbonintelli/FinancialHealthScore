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
    sector: str = Field(..., description="e.g. manufacturing, services, trading, auto_components")
    employee_count: int | None = Field(None, ge=1)
    years_in_operation: float | None = Field(None, ge=0)
    annual_turnover_inr: float | None = Field(None, ge=0)


class FounderProfile(BaseModel):
    """Founder/management capability and key-person risk indicators."""

    name: str | None = None
    years_industry_experience: float | None = Field(None, ge=0, description="Years in the same industry")
    years_entrepreneurship: float | None = Field(None, ge=0, description="Years running own business")
    education_level: str | None = Field(
        None,
        description="e.g. diploma, graduate, post_graduate, professional",
    )
    prior_business_exits: int = Field(0, ge=0, description="Successful prior business exits")
    cibil_score: int | None = Field(None, ge=300, le=900, description="Founder personal credit score")
    prior_defaults: int = Field(0, ge=0, description="Count of prior loan defaults")
    management_team_size: int | None = Field(None, ge=1, description="Senior management team count")
    succession_plan_documented: bool = False
    industry_certifications: list[str] = Field(
        default_factory=list,
        description="e.g. Six Sigma, ISO lead auditor, domain certifications",
    )
    linkedin_presence_score: float | None = Field(
        None, ge=0, le=100, description="Professional network strength proxy (0-100)"
    )


class MarketSentiment(BaseModel):
    """Market perception and reputation signals for the MSME."""

    overall_sentiment_score: float | None = Field(
        None, ge=0, le=100, description="Composite market sentiment (0=very negative, 100=very positive)"
    )
    customer_nps: float | None = Field(None, ge=-100, le=100, description="Net Promoter Score")
    google_rating: float | None = Field(None, ge=1, le=5)
    google_review_count: int | None = Field(None, ge=0)
    media_mentions_12m: int | None = Field(None, ge=0, description="News/media mentions in trailing 12 months")
    positive_media_pct: float | None = Field(None, ge=0, le=100)
    customer_retention_rate_pct: float | None = Field(None, ge=0, le=100)
    supplier_trust_score: float | None = Field(None, ge=0, le=100)
    litigation_count_3y: int = Field(0, ge=0, description="Active or recent litigation cases")
    gst_compliance_rating: str | None = Field(
        None, description="e.g. excellent, good, average, poor"
    )


class ProductLine(BaseModel):
    name: str
    category: str = Field(..., description="e.g. auto_components, precision_parts, consumables")
    revenue_share_pct: float = Field(..., ge=0, le=100)
    hsn_code: str | None = None
    is_export_oriented: bool = False


class ProductMarketProfile(BaseModel):
    """Products manufactured and market demand outlook."""

    products: list[ProductLine] = Field(default_factory=list)
    primary_market: str | None = Field(None, description="e.g. domestic, export, both")
    export_revenue_pct: float | None = Field(None, ge=0, le=100)
    market_demand_outlook: str | None = Field(
        None,
        description="strong_growth, moderate_growth, stable, declining",
    )
    sector_growth_rate_pct: float | None = Field(
        None, description="Industry sector CAGR or growth rate"
    )
    capacity_utilisation_pct: float | None = Field(None, ge=0, le=100)
    order_book_months: float | None = Field(
        None, ge=0, description="Months of confirmed orders in pipeline"
    )
    import_substitution_potential: bool = False
    ev_supply_chain_exposure: bool = False


class GovernmentPolicyEnrollment(BaseModel):
    """MSME enrollment in government schemes and policy alignment."""

    enrolled_scheme_codes: list[str] = Field(
        default_factory=list,
        description="Policy codes from catalog e.g. UDYAM, CGTMSE, PLI_AUTO",
    )
    pending_applications: list[str] = Field(default_factory=list)
    zed_certification_level: str | None = Field(
        None, description="bronze, silver, gold, diamond, or None"
    )
    iso_certifications: list[str] = Field(default_factory=list)
    gst_filing_compliance_pct: float | None = Field(None, ge=0, le=100)
    delayed_payment_complaints_filed: int = Field(0, ge=0)
    received_govt_subsidy_inr: float | None = Field(None, ge=0)


class PolicyAlignmentInsight(BaseModel):
    code: str
    name: str
    status: str = Field(..., description="enrolled, eligible, not_applicable, recommended")
    alignment_score: float = Field(..., ge=0, le=100)
    benefit_summary: str
    action_recommendation: str | None = None


class GovernmentPolicyAssessment(BaseModel):
    overall_alignment_score: float = Field(..., ge=0, le=100)
    enrolled_count: int
    eligible_unenrolled_count: int
    policy_insights: list[PolicyAlignmentInsight]
    sector_tailwinds: list[str] = Field(default_factory=list)
    financing_opportunities: list[str] = Field(default_factory=list)


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
    founder: FounderProfile | None = None
    market_sentiment: MarketSentiment | None = None
    product_market: ProductMarketProfile | None = None
    government_policy: GovernmentPolicyEnrollment | None = None


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
    government_policy_assessment: GovernmentPolicyAssessment | None = None
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
