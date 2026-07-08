"""Sample MSME data for demonstrations and testing."""

from datetime import date

from app.models.schemas import (
    AccountingSnapshot,
    AssessmentRequest,
    AudienceRole,
    FinancialDataInput,
    FounderProfile,
    GovernmentPolicyEnrollment,
    MarketSentiment,
    MonthlyCashFlow,
    MSMEProfile,
    PaymentRecord,
    ProductLine,
    ProductMarketProfile,
    UtilityBill,
)


def build_demo_request(audience: AudienceRole = AudienceRole.CREDIT_TEAM) -> AssessmentRequest:
    """Build a realistic demo MSME assessment request for IDBI Innovate 2026."""
    return AssessmentRequest(
        financial_data=FinancialDataInput(
            profile=MSMEProfile(
                msme_id="msme-demo-001",
                business_name="Shree Ganesh Auto Components Pvt Ltd",
                udyam_number="UDYAM-MH-12-0012345",
                gstin="27AABCS1234F1Z5",
                sector="auto_components",
                employee_count=85,
                years_in_operation=12,
                annual_turnover_inr=48_000_000,
            ),
            accounting=AccountingSnapshot(
                revenue_inr=48_000_000,
                cost_of_goods_inr=31_200_000,
                operating_expenses_inr=9_600_000,
                current_assets_inr=14_500_000,
                current_liabilities_inr=8_200_000,
                total_debt_inr=12_000_000,
                equity_inr=18_500_000,
                net_profit_inr=4_800_000,
                period_end=date(2026, 3, 31),
            ),
            cash_flows=[
                MonthlyCashFlow(month="2026-01", inflows=4_100_000, outflows=3_750_000),
                MonthlyCashFlow(month="2026-02", inflows=3_850_000, outflows=3_620_000),
                MonthlyCashFlow(month="2026-03", inflows=4_450_000, outflows=3_890_000),
                MonthlyCashFlow(month="2026-04", inflows=4_200_000, outflows=3_800_000),
                MonthlyCashFlow(month="2026-05", inflows=3_950_000, outflows=3_700_000),
                MonthlyCashFlow(month="2026-06", inflows=4_300_000, outflows=3_850_000),
            ],
            utility_bills=[
                UtilityBill(month="2026-01", electricity_kwh=18500, electricity_cost_inr=148_000, fuel_litres=2200, fuel_cost_inr=198_000),
                UtilityBill(month="2026-02", electricity_kwh=17200, electricity_cost_inr=138_000, fuel_litres=2050, fuel_cost_inr=185_000),
                UtilityBill(month="2026-03", electricity_kwh=19100, electricity_cost_inr=153_000, fuel_litres=2350, fuel_cost_inr=212_000),
            ],
            payment_records=[
                PaymentRecord(counterparty="Tata Steel Ltd", amount_inr=850_000, due_date=date(2026, 4, 15), paid_date=date(2026, 4, 14), status="on_time"),
                PaymentRecord(counterparty="Mahindra Logistics", amount_inr=320_000, due_date=date(2026, 4, 20), paid_date=date(2026, 4, 22), status="late"),
                PaymentRecord(counterparty="Bharat Forge", amount_inr=1_200_000, due_date=date(2026, 5, 1), paid_date=date(2026, 4, 28), status="on_time"),
                PaymentRecord(counterparty="Local Supplier Co", amount_inr=95_000, due_date=date(2026, 5, 10), paid_date=date(2026, 5, 10), status="on_time"),
                PaymentRecord(counterparty="MSEB Electricity", amount_inr=148_000, due_date=date(2026, 4, 25), paid_date=date(2026, 4, 25), status="on_time"),
            ],
            bank_statement_summary={
                "avg_monthly_balance_inr": 3_200_000,
                "min_monthly_balance_inr": 1_100_000,
                "cheque_bounce_count_12m": 1,
            },
            founder=FounderProfile(
                name="Rajesh Patil",
                years_industry_experience=18,
                years_entrepreneurship=12,
                education_level="graduate",
                prior_business_exits=0,
                cibil_score=782,
                prior_defaults=0,
                management_team_size=4,
                succession_plan_documented=False,
                industry_certifications=["ISO 9001 Lead Auditor", "Lean Six Sigma Green Belt"],
                linkedin_presence_score=72,
            ),
            market_sentiment=MarketSentiment(
                overall_sentiment_score=74,
                customer_nps=52,
                google_rating=4.2,
                google_review_count=38,
                media_mentions_12m=6,
                positive_media_pct=83,
                customer_retention_rate_pct=86,
                supplier_trust_score=78,
                litigation_count_3y=0,
                gst_compliance_rating="good",
            ),
            product_market=ProductMarketProfile(
                products=[
                    ProductLine(name="Precision Forged Crankshafts", category="auto_components", revenue_share_pct=42, hsn_code="8483", is_export_oriented=True),
                    ProductLine(name="Transmission Gears", category="auto_components", revenue_share_pct=35, hsn_code="8483"),
                    ProductLine(name="EV Motor Housings", category="auto_components", revenue_share_pct=15, hsn_code="8501", is_export_oriented=False),
                    ProductLine(name="General Machined Parts", category="auto_components", revenue_share_pct=8, hsn_code="8483"),
                ],
                primary_market="both",
                export_revenue_pct=22,
                market_demand_outlook="moderate_growth",
                sector_growth_rate_pct=9.5,
                capacity_utilisation_pct=78,
                order_book_months=4.2,
                import_substitution_potential=True,
                ev_supply_chain_exposure=True,
            ),
            government_policy=GovernmentPolicyEnrollment(
                enrolled_scheme_codes=["CGTMSE", "CLCSS", "SAMADHAN"],
                pending_applications=["PLI_AUTO"],
                zed_certification_level="silver",
                iso_certifications=["ISO 9001:2015", "IATF 16949"],
                gst_filing_compliance_pct=96,
                delayed_payment_complaints_filed=1,
                received_govt_subsidy_inr=1_850_000,
            ),
        ),
        include_carbon_intelligence=True,
        audience=audience,
    )


def build_minimal_request(
    msme_id: str,
    business_name: str,
    annual_revenue: float,
    audience: AudienceRole = AudienceRole.PORTFOLIO_ANALYST,
) -> AssessmentRequest:
    """Build minimal financial input when only Carbon Intelligence data is available."""
    estimated_cogs = annual_revenue * 0.65
    estimated_opex = annual_revenue * 0.20
    return AssessmentRequest(
        financial_data=FinancialDataInput(
            profile=MSMEProfile(
                msme_id=msme_id,
                business_name=business_name,
                sector="manufacturing",
            ),
            accounting=AccountingSnapshot(
                revenue_inr=annual_revenue,
                cost_of_goods_inr=estimated_cogs,
                operating_expenses_inr=estimated_opex,
                current_assets_inr=annual_revenue * 0.30,
                current_liabilities_inr=annual_revenue * 0.18,
                total_debt_inr=annual_revenue * 0.25,
                equity_inr=annual_revenue * 0.35,
            ),
        ),
        include_carbon_intelligence=True,
        audience=audience,
    )
