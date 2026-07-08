"""Financial Health Score scoring engine with explainable insights."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.models.schemas import (
    AssessmentRequest,
    AudienceRole,
    CarbonIntelligenceSummary,
    ConfidenceLevel,
    DataGap,
    DimensionScore,
    EvidenceInsight,
    FinancialHealthScoreResult,
    GovernmentPolicyAssessment,
    PolicyAlignmentInsight,
    RiskIndicator,
    RiskLevel,
)
from app.data.government_policies import get_applicable_policies, get_policy_by_code
from app.services.credit_ratings import crisil_rating_to_score


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _score_to_grade(score: float) -> str:
    if score >= 90:
        return "A+"
    if score >= 80:
        return "A"
    if score >= 70:
        return "B+"
    if score >= 60:
        return "B"
    if score >= 50:
        return "C+"
    if score >= 40:
        return "C"
    if score >= 30:
        return "D"
    return "F"


def _score_to_risk(score: float) -> RiskLevel:
    if score >= 75:
        return RiskLevel.LOW
    if score >= 60:
        return RiskLevel.MODERATE
    if score >= 45:
        return RiskLevel.ELEVATED
    if score >= 30:
        return RiskLevel.HIGH
    return RiskLevel.CRITICAL


def _avg_confidence(levels: list[ConfidenceLevel]) -> ConfidenceLevel:
    order = {ConfidenceLevel.HIGH: 3, ConfidenceLevel.MEDIUM: 2, ConfidenceLevel.LOW: 1}
    if not levels:
        return ConfidenceLevel.LOW
    avg = sum(order[c] for c in levels) / len(levels)
    if avg >= 2.5:
        return ConfidenceLevel.HIGH
    if avg >= 1.5:
        return ConfidenceLevel.MEDIUM
    return ConfidenceLevel.LOW


class ScoringEngine:
    """Computes explainable Financial Health Scores from financial and carbon data."""

    DIMENSION_WEIGHTS = {
        "financial_resilience": 0.17,
        "cash_flow_health": 0.11,
        "operational_stability": 0.09,
        "payment_behaviour": 0.09,
        "carbon_transition_risk": 0.07,
        "alternative_data_signals": 0.07,
        "founder_capability": 0.11,
        "market_sentiment": 0.07,
        "product_demand_outlook": 0.06,
        "government_policy_alignment": 0.05,
        "credit_history_debt_servicing": 0.11,
    }

    def assess(
        self,
        request: AssessmentRequest,
        carbon_data: dict[str, Any] | None = None,
    ) -> FinancialHealthScoreResult:
        fd = request.financial_data
        profile = fd.profile
        acct = fd.accounting

        dimensions: list[DimensionScore] = []
        dimensions.append(self._score_financial_resilience(acct))
        dimensions.append(self._score_cash_flow(fd.cash_flows, carbon_data))
        dimensions.append(self._score_operational_stability(acct, fd.utility_bills, profile))
        dimensions.append(self._score_payment_behaviour(fd.payment_records, carbon_data))
        dimensions.append(self._score_carbon_transition(carbon_data, fd.utility_bills))
        dimensions.append(self._score_alternative_data(fd, carbon_data))
        dimensions.append(self._score_founder_capability(fd.founder, profile))
        dimensions.append(self._score_market_sentiment(fd.market_sentiment))
        dimensions.append(self._score_product_demand(fd.product_market, profile))
        dimensions.append(self._score_government_policy_alignment(fd, profile))
        dimensions.append(self._score_credit_history_debt_servicing(fd.credit_bureau, fd.accounting))

        overall = sum(d.score * d.weight for d in dimensions)
        confidences = [d.confidence for d in dimensions]
        overall_confidence = _avg_confidence(confidences)

        data_gaps = self._identify_data_gaps(fd, carbon_data)
        risk_indicators = self._build_risk_indicators(dimensions, acct, carbon_data, fd)
        key_insights = self._build_key_insights(dimensions, risk_indicators)
        green_opportunities = self._identify_green_finance_opportunities(dimensions, carbon_data)
        carbon_summary = self._build_carbon_summary(carbon_data, profile.msme_id)
        policy_assessment = self._build_government_policy_assessment(fd, profile)
        audience_summary = self._audience_summary(request.audience, overall, risk_indicators)

        return FinancialHealthScoreResult(
            assessment_id=str(uuid.uuid4()),
            business_name=profile.business_name,
            msme_id=profile.msme_id,
            generated_at=datetime.now(timezone.utc),
            overall_score=round(overall, 1),
            overall_risk_level=_score_to_risk(overall),
            overall_confidence=overall_confidence,
            grade=_score_to_grade(overall),
            dimension_scores=dimensions,
            risk_indicators=risk_indicators,
            key_insights=key_insights,
            green_finance_opportunities=green_opportunities,
            carbon_intelligence=carbon_summary,
            government_policy_assessment=policy_assessment,
            data_gaps=data_gaps,
            audience_summary=audience_summary,
            metadata={
                "sector": profile.sector,
                "audience": request.audience.value,
                "data_sources": self._data_sources(fd, carbon_data),
                "data_gap_count": len(data_gaps),
                "high_priority_gaps": sum(1 for g in data_gaps if g.severity == "high"),
            },
        )

    def _score_financial_resilience(self, acct) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []

        current_ratio = (
            acct.current_assets_inr / acct.current_liabilities_inr
            if acct.current_liabilities_inr > 0
            else 2.0
        )
        cr_score = _clamp(current_ratio * 35, 0, 100)
        scores.append(cr_score)
        insights.append(
            EvidenceInsight(
                indicator="Current Ratio",
                category="liquidity",
                value=round(current_ratio, 2),
                benchmark=1.5,
                impact="positive" if current_ratio >= 1.5 else "negative",
                narrative=(
                    f"Current ratio of {current_ratio:.2f} indicates "
                    f"{'adequate' if current_ratio >= 1.5 else 'strained'} short-term liquidity."
                ),
                confidence=ConfidenceLevel.HIGH,
                data_source="accounting_records",
            )
        )

        total_assets = acct.current_assets_inr + acct.equity_inr
        debt_ratio = acct.total_debt_inr / total_assets if total_assets > 0 else 0
        dr_score = _clamp(100 - debt_ratio * 120, 0, 100)
        scores.append(dr_score)
        insights.append(
            EvidenceInsight(
                indicator="Debt-to-Assets Ratio",
                category="leverage",
                value=round(debt_ratio, 2),
                benchmark=0.5,
                impact="positive" if debt_ratio <= 0.5 else "negative",
                narrative=(
                    f"Debt-to-assets ratio of {debt_ratio:.0%} suggests "
                    f"{'conservative' if debt_ratio <= 0.5 else 'elevated'} leverage."
                ),
                confidence=ConfidenceLevel.HIGH,
                data_source="accounting_records",
            )
        )

        margin = (
            (acct.revenue_inr - acct.cost_of_goods_inr - acct.operating_expenses_inr)
            / acct.revenue_inr
            if acct.revenue_inr > 0
            else 0
        )
        margin_score = _clamp(margin * 300 + 30, 0, 100)
        scores.append(margin_score)
        insights.append(
            EvidenceInsight(
                indicator="Operating Margin",
                category="profitability",
                value=f"{margin:.1%}",
                benchmark="10%",
                impact="positive" if margin >= 0.10 else "negative",
                narrative=(
                    f"Operating margin of {margin:.1%} reflects "
                    f"{'healthy' if margin >= 0.10 else 'thin'} profitability."
                ),
                confidence=ConfidenceLevel.HIGH,
                data_source="accounting_records",
            )
        )

        score = sum(scores) / len(scores) if scores else 50
        return DimensionScore(
            dimension="financial_resilience",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["financial_resilience"],
            risk_level=_score_to_risk(score),
            confidence=ConfidenceLevel.HIGH,
            insights=insights,
        )

    def _score_cash_flow(self, cash_flows, carbon_data) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        confidence = ConfidenceLevel.MEDIUM

        if carbon_data and carbon_data.get("transactions_summary"):
            txn = carbon_data["transactions_summary"]
            inflow = txn.get("avgMonthlyInflowInr", 0)
            outflow = txn.get("avgMonthlyOutflowInr", 0)
            net = inflow - outflow
            margin_pct = (net / inflow * 100) if inflow > 0 else 0
            volatility = txn.get("inflowVolatilityPct", 20)

            score = _clamp(50 + margin_pct * 2 - volatility * 0.5, 0, 100)
            insights.append(
                EvidenceInsight(
                    indicator="Net Cash Margin",
                    category="cash_flow",
                    value=f"{margin_pct:.1f}%",
                    benchmark="8%",
                    impact="positive" if margin_pct >= 8 else "negative",
                    narrative=(
                        f"Average monthly net cash margin of {margin_pct:.1f}% from transaction analytics."
                    ),
                    confidence=ConfidenceLevel.HIGH,
                    data_source="ci.sustainow.in/transactions",
                )
            )
            insights.append(
                EvidenceInsight(
                    indicator="Inflow Volatility",
                    category="cash_flow",
                    value=f"{volatility:.1f}%",
                    benchmark="15%",
                    impact="positive" if volatility <= 15 else "negative",
                    narrative=f"Cash inflow volatility at {volatility:.1f}% indicates operational stability.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="ci.sustainow.in/transactions",
                )
            )
            confidence = ConfidenceLevel.HIGH
        elif cash_flows:
            nets = [cf.inflows - cf.outflows for cf in cash_flows]
            avg_net = sum(nets) / len(nets)
            avg_inflow = sum(cf.inflows for cf in cash_flows) / len(cash_flows)
            margin_pct = (avg_net / avg_inflow * 100) if avg_inflow > 0 else 0
            volatility = (
                (sum((n - avg_net) ** 2 for n in nets) / len(nets)) ** 0.5 / abs(avg_net) * 100
                if avg_net != 0
                else 50
            )

            score = _clamp(50 + margin_pct * 2 - min(volatility, 50) * 0.4, 0, 100)
            insights.append(
                EvidenceInsight(
                    indicator="Cash Flow Margin",
                    category="cash_flow",
                    value=f"{margin_pct:.1f}%",
                    benchmark="8%",
                    impact="positive" if margin_pct >= 8 else "negative",
                    narrative=f"Trailing cash flow margin of {margin_pct:.1f}% from submitted records.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="submitted_cash_flows",
                )
            )
        else:
            score = 55
            insights.append(
                EvidenceInsight(
                    indicator="Cash Flow Data",
                    category="cash_flow",
                    value="unavailable",
                    benchmark=None,
                    impact="neutral",
                    narrative="Limited cash flow data available; score based on accounting proxies.",
                    confidence=ConfidenceLevel.LOW,
                    data_source="inferred",
                )
            )
            confidence = ConfidenceLevel.LOW

        return DimensionScore(
            dimension="cash_flow_health",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["cash_flow_health"],
            risk_level=_score_to_risk(score),
            confidence=confidence,
            insights=insights,
        )

    def _score_operational_stability(self, acct, utility_bills, profile) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []

        revenue = acct.revenue_inr
        opex_ratio = acct.operating_expenses_inr / revenue if revenue > 0 else 1
        opex_score = _clamp(100 - opex_ratio * 80, 0, 100)
        scores.append(opex_score)
        insights.append(
            EvidenceInsight(
                indicator="Opex-to-Revenue Ratio",
                category="operational_efficiency",
                value=f"{opex_ratio:.1%}",
                benchmark="25%",
                impact="positive" if opex_ratio <= 0.25 else "negative",
                narrative=f"Operating expenses consume {opex_ratio:.1%} of revenue.",
                confidence=ConfidenceLevel.HIGH,
                data_source="accounting_records",
            )
        )

        if utility_bills:
            total_energy = sum(
                (b.electricity_cost_inr or 0) + (b.fuel_cost_inr or 0) for b in utility_bills
            )
            months = len(utility_bills)
            annual_energy = total_energy * (12 / months) if months > 0 else 0
            energy_share = annual_energy / revenue if revenue > 0 else 0
            energy_score = _clamp(100 - energy_share * 400, 0, 100)
            scores.append(energy_score)
            insights.append(
                EvidenceInsight(
                    indicator="Energy Cost Exposure",
                    category="operational_volatility",
                    value=f"{energy_share:.1%}",
                    benchmark="8%",
                    impact="positive" if energy_share <= 0.08 else "negative",
                    narrative=(
                        f"Energy costs represent {energy_share:.1%} of revenue, "
                        f"{'within' if energy_share <= 0.08 else 'above'} typical MSME benchmarks."
                    ),
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="utility_bills",
                )
            )

        if profile.years_in_operation:
            tenure_score = _clamp(40 + profile.years_in_operation * 4, 0, 100)
            scores.append(tenure_score)
            insights.append(
                EvidenceInsight(
                    indicator="Business Tenure",
                    category="stability",
                    value=f"{profile.years_in_operation:.0f} years",
                    benchmark="5 years",
                    impact="positive" if profile.years_in_operation >= 5 else "neutral",
                    narrative=f"Business operating for {profile.years_in_operation:.0f} years.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="msme_profile",
                )
            )

        score = sum(scores) / len(scores) if scores else 50
        return DimensionScore(
            dimension="operational_stability",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["operational_stability"],
            risk_level=_score_to_risk(score),
            confidence=ConfidenceLevel.MEDIUM,
            insights=insights,
        )

    def _score_payment_behaviour(self, payment_records, carbon_data) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        confidence = ConfidenceLevel.MEDIUM

        if payment_records:
            total = len(payment_records)
            on_time = sum(1 for p in payment_records if p.status == "on_time")
            late = sum(1 for p in payment_records if p.status in ("late", "overdue"))
            defaulted = sum(1 for p in payment_records if p.status == "defaulted")

            on_time_pct = on_time / total * 100
            score = _clamp(on_time_pct - defaulted * 20, 0, 100)

            insights.append(
                EvidenceInsight(
                    indicator="On-Time Payment Rate",
                    category="payment_behaviour",
                    value=f"{on_time_pct:.0f}%",
                    benchmark="90%",
                    impact="positive" if on_time_pct >= 90 else "negative",
                    narrative=f"{on_time_pct:.0f}% of payments made on time across {total} records.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="payment_records",
                )
            )
            if late > 0:
                insights.append(
                    EvidenceInsight(
                        indicator="Late/Overdue Payments",
                        category="payment_behaviour",
                        value=late,
                        benchmark=0,
                        impact="negative",
                        narrative=f"{late} late or overdue payment(s) detected.",
                        confidence=ConfidenceLevel.HIGH,
                        data_source="payment_records",
                    )
                )
            confidence = ConfidenceLevel.HIGH
        elif carbon_data and carbon_data.get("transactions_summary"):
            late_rate = carbon_data["transactions_summary"].get("latePaymentRatePct", 10)
            score = _clamp(100 - late_rate * 3, 0, 100)
            insights.append(
                EvidenceInsight(
                    indicator="Late Payment Rate",
                    category="payment_behaviour",
                    value=f"{late_rate:.1f}%",
                    benchmark="5%",
                    impact="positive" if late_rate <= 5 else "negative",
                    narrative=f"Transaction analytics show {late_rate:.1f}% late payment rate.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="ci.sustainow.in/transactions",
                )
            )
        else:
            score = 60
            insights.append(
                EvidenceInsight(
                    indicator="Payment History",
                    category="payment_behaviour",
                    value="limited",
                    benchmark=None,
                    impact="neutral",
                    narrative="Insufficient payment history; neutral score applied.",
                    confidence=ConfidenceLevel.LOW,
                    data_source="inferred",
                )
            )
            confidence = ConfidenceLevel.LOW

        return DimensionScore(
            dimension="payment_behaviour",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["payment_behaviour"],
            risk_level=_score_to_risk(score),
            confidence=confidence,
            insights=insights,
        )

    def _score_carbon_transition(self, carbon_data, utility_bills) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        confidence = ConfidenceLevel.LOW

        if carbon_data and carbon_data.get("carbon_summary"):
            carbon = carbon_data["carbon_summary"]
            intensity = carbon.get("carbonIntensityKgPerRevenue", 0.5)
            energy_share = carbon.get("energyCostSharePct", 15) / 100
            completeness = carbon.get("dataCompletenessPct", 50)

            intensity_score = _clamp(100 - intensity * 80, 0, 100)
            energy_score = _clamp(100 - energy_share * 300, 0, 100)
            score = (intensity_score + energy_score) / 2

            insights.append(
                EvidenceInsight(
                    indicator="Carbon Intensity",
                    category="transition_risk",
                    value=f"{intensity:.2f} kgCO₂/₹",
                    benchmark="0.30",
                    impact="positive" if intensity <= 0.30 else "negative",
                    narrative=(
                        f"Carbon intensity of {intensity:.2f} kgCO₂ per revenue unit "
                        f"from Carbon Intelligence assessment."
                    ),
                    confidence=ConfidenceLevel.HIGH if completeness >= 70 else ConfidenceLevel.MEDIUM,
                    data_source="ci.sustainow.in/carbon-summary",
                )
            )
            insights.append(
                EvidenceInsight(
                    indicator="Energy Cost Share",
                    category="transition_risk",
                    value=f"{energy_share:.1%}",
                    benchmark="10%",
                    impact="positive" if energy_share <= 0.10 else "negative",
                    narrative=f"Energy costs account for {energy_share:.1%} of operational spend.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="ci.sustainow.in/carbon-summary",
                )
            )

            reports = carbon_data.get("reports_overview", {})
            if reports.get("transitionPlanDocumented") is False:
                insights.append(
                    EvidenceInsight(
                        indicator="Transition Plan",
                        category="transition_risk",
                        value="not documented",
                        benchmark="documented",
                        impact="negative",
                        narrative="No documented decarbonisation transition plan on file.",
                        confidence=ConfidenceLevel.MEDIUM,
                        data_source="ci.sustainow.in/reports",
                    )
                )
                score = max(0, score - 8)

            confidence = ConfidenceLevel.HIGH if completeness >= 75 else ConfidenceLevel.MEDIUM
        elif utility_bills:
            score = 65
            insights.append(
                EvidenceInsight(
                    indicator="Carbon Assessment",
                    category="transition_risk",
                    value="utility proxy",
                    benchmark=None,
                    impact="neutral",
                    narrative="Carbon score estimated from utility bill data; full CI assessment recommended.",
                    confidence=ConfidenceLevel.LOW,
                    data_source="utility_bills",
                )
            )
        else:
            score = 50
            insights.append(
                EvidenceInsight(
                    indicator="Carbon Data",
                    category="transition_risk",
                    value="unavailable",
                    benchmark=None,
                    impact="neutral",
                    narrative="No carbon intelligence data; link MSME ID to ci.sustainow.in for enrichment.",
                    confidence=ConfidenceLevel.LOW,
                    data_source="none",
                )
            )

        return DimensionScore(
            dimension="carbon_transition_risk",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["carbon_transition_risk"],
            risk_level=_score_to_risk(score),
            confidence=confidence,
            insights=insights,
        )

    def _score_alternative_data(self, fd, carbon_data) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []
        confidence = ConfidenceLevel.MEDIUM

        if carbon_data and carbon_data.get("transactions_summary"):
            txn = carbon_data["transactions_summary"]
            supplier_conc = txn.get("supplierConcentrationTop3Pct", 50)
            customer_conc = txn.get("customerConcentrationTop3Pct", 50)

            supplier_score = _clamp(100 - max(0, supplier_conc - 30) * 1.5, 0, 100)
            customer_score = _clamp(100 - max(0, customer_conc - 30) * 1.5, 0, 100)
            scores.extend([supplier_score, customer_score])

            insights.append(
                EvidenceInsight(
                    indicator="Supplier Concentration (Top 3)",
                    category="concentration_risk",
                    value=f"{supplier_conc:.0f}%",
                    benchmark="30%",
                    impact="positive" if supplier_conc <= 40 else "negative",
                    narrative=f"Top 3 suppliers account for {supplier_conc:.0f}% of spend.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="ci.sustainow.in/transactions",
                )
            )
            insights.append(
                EvidenceInsight(
                    indicator="Customer Concentration (Top 3)",
                    category="concentration_risk",
                    value=f"{customer_conc:.0f}%",
                    benchmark="30%",
                    impact="positive" if customer_conc <= 40 else "negative",
                    narrative=f"Top 3 customers contribute {customer_conc:.0f}% of revenue.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="ci.sustainow.in/transactions",
                )
            )
            confidence = ConfidenceLevel.HIGH

        if fd.bank_statement_summary:
            avg_balance = fd.bank_statement_summary.get("avg_monthly_balance_inr", 0)
            revenue = fd.accounting.revenue_inr
            if revenue > 0:
                buffer_months = (avg_balance * 12) / (revenue / 12) if revenue else 0
                buffer_score = _clamp(buffer_months * 25, 0, 100)
                scores.append(buffer_score)
                insights.append(
                    EvidenceInsight(
                        indicator="Cash Buffer (Months)",
                        category="liquidity",
                        value=round(buffer_months, 1),
                        benchmark=2,
                        impact="positive" if buffer_months >= 2 else "negative",
                        narrative=f"Bank balance covers ~{buffer_months:.1f} months of revenue.",
                        confidence=ConfidenceLevel.MEDIUM,
                        data_source="bank_statement_summary",
                    )
                )

        score = sum(scores) / len(scores) if scores else 55
        return DimensionScore(
            dimension="alternative_data_signals",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["alternative_data_signals"],
            risk_level=_score_to_risk(score),
            confidence=confidence,
            insights=insights,
        )

    def _score_founder_capability(self, founder, profile) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []
        confidence = ConfidenceLevel.LOW

        if not founder:
            return DimensionScore(
                dimension="founder_capability",
                score=55.0,
                weight=self.DIMENSION_WEIGHTS["founder_capability"],
                risk_level=RiskLevel.MODERATE,
                confidence=ConfidenceLevel.LOW,
                insights=[
                    EvidenceInsight(
                        indicator="Founder Profile",
                        category="key_person_risk",
                        value="not provided",
                        benchmark=None,
                        impact="neutral",
                        narrative="Founder capability data not submitted; neutral score applied. Request founder profile for key-person risk assessment.",
                        confidence=ConfidenceLevel.LOW,
                        data_source="inferred",
                    )
                ],
            )

        if founder.years_industry_experience is not None:
            exp_score = _clamp(40 + founder.years_industry_experience * 3, 0, 100)
            scores.append(exp_score)
            insights.append(
                EvidenceInsight(
                    indicator="Industry Experience",
                    category="founder_capability",
                    value=f"{founder.years_industry_experience:.0f} years",
                    benchmark="10 years",
                    impact="positive" if founder.years_industry_experience >= 10 else "neutral",
                    narrative=(
                        f"Founder brings {founder.years_industry_experience:.0f} years of industry experience, "
                        f"{'reducing' if founder.years_industry_experience >= 10 else 'moderating'} execution risk."
                    ),
                    confidence=ConfidenceLevel.HIGH,
                    data_source="founder_profile",
                )
            )

        if founder.years_entrepreneurship is not None:
            ent_score = _clamp(35 + founder.years_entrepreneurship * 4, 0, 100)
            scores.append(ent_score)
            insights.append(
                EvidenceInsight(
                    indicator="Entrepreneurship Tenure",
                    category="founder_capability",
                    value=f"{founder.years_entrepreneurship:.0f} years",
                    benchmark="5 years",
                    impact="positive" if founder.years_entrepreneurship >= 5 else "neutral",
                    narrative=f"Founder has operated own business for {founder.years_entrepreneurship:.0f} years.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="founder_profile",
                )
            )

        edu_scores = {
            "diploma": 55,
            "graduate": 70,
            "post_graduate": 80,
            "professional": 85,
            "doctorate": 90,
        }
        if founder.education_level:
            edu_score = edu_scores.get(founder.education_level.lower(), 60)
            scores.append(edu_score)
            insights.append(
                EvidenceInsight(
                    indicator="Education Level",
                    category="founder_capability",
                    value=founder.education_level,
                    benchmark="graduate",
                    impact="positive" if edu_score >= 70 else "neutral",
                    narrative=f"Educational background: {founder.education_level.replace('_', ' ')}.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="founder_profile",
                )
            )

        if founder.cibil_score is not None:
            cibil_score = _clamp((founder.cibil_score - 300) / 6, 0, 100)
            scores.append(cibil_score)
            insights.append(
                EvidenceInsight(
                    indicator="Founder CIBIL Score",
                    category="key_person_risk",
                    value=founder.cibil_score,
                    benchmark=750,
                    impact="positive" if founder.cibil_score >= 750 else "negative" if founder.cibil_score < 650 else "neutral",
                    narrative=(
                        f"Personal credit score of {founder.cibil_score} "
                        f"{'supports' if founder.cibil_score >= 750 else 'raises concerns for' if founder.cibil_score < 650 else 'is acceptable for'} "
                        "founder risk assessment."
                    ),
                    confidence=ConfidenceLevel.HIGH,
                    data_source="credit_bureau",
                )
            )

        if founder.prior_defaults > 0:
            scores.append(_clamp(40 - founder.prior_defaults * 15, 0, 100))
            insights.append(
                EvidenceInsight(
                    indicator="Prior Loan Defaults",
                    category="key_person_risk",
                    value=founder.prior_defaults,
                    benchmark=0,
                    impact="negative",
                    narrative=f"{founder.prior_defaults} prior loan default(s) on founder record — elevated key-person risk.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="credit_bureau",
                )
            )

        if founder.prior_business_exits > 0:
            scores.append(_clamp(60 + founder.prior_business_exits * 10, 0, 100))
            insights.append(
                EvidenceInsight(
                    indicator="Prior Successful Exits",
                    category="founder_capability",
                    value=founder.prior_business_exits,
                    benchmark=0,
                    impact="positive",
                    narrative=f"{founder.prior_business_exits} prior successful business exit(s) demonstrate track record.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="founder_profile",
                )
            )

        if founder.management_team_size is not None:
            team_score = _clamp(40 + founder.management_team_size * 8, 0, 100)
            scores.append(team_score)
            insights.append(
                EvidenceInsight(
                    indicator="Management Team Depth",
                    category="succession_risk",
                    value=founder.management_team_size,
                    benchmark=3,
                    impact="positive" if founder.management_team_size >= 3 else "negative",
                    narrative=(
                        f"Management team of {founder.management_team_size} senior leaders "
                        f"{'reduces' if founder.management_team_size >= 3 else 'increases'} key-person dependency."
                    ),
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="founder_profile",
                )
            )

        if founder.succession_plan_documented:
            scores.append(85)
            insights.append(
                EvidenceInsight(
                    indicator="Succession Plan",
                    category="succession_risk",
                    value="documented",
                    benchmark="documented",
                    impact="positive",
                    narrative="Documented succession plan mitigates key-person risk.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="founder_profile",
                )
            )
        else:
            scores.append(45)
            insights.append(
                EvidenceInsight(
                    indicator="Succession Plan",
                    category="succession_risk",
                    value="not documented",
                    benchmark="documented",
                    impact="negative",
                    narrative="No documented succession plan — key-person risk if founder is unavailable.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="founder_profile",
                )
            )

        if founder.industry_certifications:
            cert_score = _clamp(55 + len(founder.industry_certifications) * 10, 0, 100)
            scores.append(cert_score)
            insights.append(
                EvidenceInsight(
                    indicator="Industry Certifications",
                    category="founder_capability",
                    value=", ".join(founder.industry_certifications[:3]),
                    benchmark="1+",
                    impact="positive",
                    narrative=f"Founder holds {len(founder.industry_certifications)} industry certification(s).",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="founder_profile",
                )
            )

        if founder.linkedin_presence_score is not None:
            scores.append(founder.linkedin_presence_score)
            insights.append(
                EvidenceInsight(
                    indicator="Professional Network",
                    category="founder_capability",
                    value=f"{founder.linkedin_presence_score:.0f}/100",
                    benchmark=60,
                    impact="positive" if founder.linkedin_presence_score >= 60 else "neutral",
                    narrative="Professional network strength supports business development capability.",
                    confidence=ConfidenceLevel.LOW,
                    data_source="alternative_data",
                )
            )

        score = sum(scores) / len(scores) if scores else 55
        confidence = ConfidenceLevel.HIGH if founder.cibil_score else ConfidenceLevel.MEDIUM
        return DimensionScore(
            dimension="founder_capability",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["founder_capability"],
            risk_level=_score_to_risk(score),
            confidence=confidence,
            insights=insights,
        )

    def _score_market_sentiment(self, sentiment) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []
        confidence = ConfidenceLevel.LOW

        if not sentiment:
            return DimensionScore(
                dimension="market_sentiment",
                score=55.0,
                weight=self.DIMENSION_WEIGHTS["market_sentiment"],
                risk_level=RiskLevel.MODERATE,
                confidence=ConfidenceLevel.LOW,
                insights=[
                    EvidenceInsight(
                        indicator="Market Sentiment",
                        category="reputation",
                        value="not provided",
                        benchmark=None,
                        impact="neutral",
                        narrative="Market sentiment data not available; recommend NPS, reviews, and media monitoring.",
                        confidence=ConfidenceLevel.LOW,
                        data_source="inferred",
                    )
                ],
            )

        if sentiment.overall_sentiment_score is not None:
            scores.append(sentiment.overall_sentiment_score)
            insights.append(
                EvidenceInsight(
                    indicator="Overall Market Sentiment",
                    category="reputation",
                    value=f"{sentiment.overall_sentiment_score:.0f}/100",
                    benchmark=70,
                    impact="positive" if sentiment.overall_sentiment_score >= 70 else "negative",
                    narrative=f"Composite market sentiment score: {sentiment.overall_sentiment_score:.0f}/100.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="sentiment_analysis",
                )
            )

        if sentiment.customer_nps is not None:
            nps_score = _clamp(50 + sentiment.customer_nps * 0.5, 0, 100)
            scores.append(nps_score)
            insights.append(
                EvidenceInsight(
                    indicator="Customer NPS",
                    category="customer_satisfaction",
                    value=sentiment.customer_nps,
                    benchmark=50,
                    impact="positive" if sentiment.customer_nps >= 50 else "negative",
                    narrative=f"Net Promoter Score of {sentiment.customer_nps:.0f} reflects customer advocacy.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="customer_surveys",
                )
            )

        if sentiment.google_rating is not None:
            rating_score = _clamp((sentiment.google_rating - 1) / 4 * 100, 0, 100)
            scores.append(rating_score)
            review_confidence = ConfidenceLevel.HIGH if (sentiment.google_review_count or 0) >= 20 else ConfidenceLevel.MEDIUM
            insights.append(
                EvidenceInsight(
                    indicator="Google Rating",
                    category="public_reputation",
                    value=f"{sentiment.google_rating:.1f}/5 ({sentiment.google_review_count or 0} reviews)",
                    benchmark="4.0",
                    impact="positive" if sentiment.google_rating >= 4.0 else "negative",
                    narrative=f"Public Google rating of {sentiment.google_rating:.1f} from {sentiment.google_review_count or 0} reviews.",
                    confidence=review_confidence,
                    data_source="public_reviews",
                )
            )

        if sentiment.positive_media_pct is not None and sentiment.media_mentions_12m:
            media_score = sentiment.positive_media_pct
            scores.append(media_score)
            insights.append(
                EvidenceInsight(
                    indicator="Media Sentiment",
                    category="reputation",
                    value=f"{sentiment.positive_media_pct:.0f}% positive ({sentiment.media_mentions_12m} mentions)",
                    benchmark="70%",
                    impact="positive" if sentiment.positive_media_pct >= 70 else "negative",
                    narrative=f"{sentiment.positive_media_pct:.0f}% of {sentiment.media_mentions_12m} media mentions are positive.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="media_monitoring",
                )
            )

        if sentiment.customer_retention_rate_pct is not None:
            ret_score = _clamp(sentiment.customer_retention_rate_pct, 0, 100)
            scores.append(ret_score)
            insights.append(
                EvidenceInsight(
                    indicator="Customer Retention",
                    category="market_stickiness",
                    value=f"{sentiment.customer_retention_rate_pct:.0f}%",
                    benchmark="80%",
                    impact="positive" if sentiment.customer_retention_rate_pct >= 80 else "negative",
                    narrative=f"Customer retention rate of {sentiment.customer_retention_rate_pct:.0f}% indicates market stickiness.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="crm_data",
                )
            )

        if sentiment.supplier_trust_score is not None:
            scores.append(sentiment.supplier_trust_score)
            insights.append(
                EvidenceInsight(
                    indicator="Supplier Trust Score",
                    category="supply_chain_reputation",
                    value=f"{sentiment.supplier_trust_score:.0f}/100",
                    benchmark=70,
                    impact="positive" if sentiment.supplier_trust_score >= 70 else "negative",
                    narrative="Supplier trust score reflects payment reliability and trade relationships.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="trade_references",
                )
            )

        if sentiment.litigation_count_3y > 0:
            lit_score = _clamp(60 - sentiment.litigation_count_3y * 20, 0, 100)
            scores.append(lit_score)
            insights.append(
                EvidenceInsight(
                    indicator="Litigation History",
                    category="legal_risk",
                    value=sentiment.litigation_count_3y,
                    benchmark=0,
                    impact="negative",
                    narrative=f"{sentiment.litigation_count_3y} litigation case(s) in past 3 years — reputational and financial risk.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="legal_records",
                )
            )

        gst_scores = {"excellent": 95, "good": 80, "average": 60, "poor": 30}
        if sentiment.gst_compliance_rating:
            gst_score = gst_scores.get(sentiment.gst_compliance_rating.lower(), 55)
            scores.append(gst_score)
            insights.append(
                EvidenceInsight(
                    indicator="GST Compliance Rating",
                    category="regulatory_compliance",
                    value=sentiment.gst_compliance_rating,
                    benchmark="good",
                    impact="positive" if gst_score >= 80 else "negative",
                    narrative=f"GST filing compliance rated as {sentiment.gst_compliance_rating}.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="gst_portal",
                )
            )

        score = sum(scores) / len(scores) if scores else 55
        confidence = ConfidenceLevel.HIGH if len(scores) >= 3 else ConfidenceLevel.MEDIUM if scores else ConfidenceLevel.LOW
        return DimensionScore(
            dimension="market_sentiment",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["market_sentiment"],
            risk_level=_score_to_risk(score),
            confidence=confidence,
            insights=insights,
        )

    def _score_product_demand(self, product_market, profile) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []
        confidence = ConfidenceLevel.LOW

        if not product_market or not product_market.products:
            return DimensionScore(
                dimension="product_demand_outlook",
                score=55.0,
                weight=self.DIMENSION_WEIGHTS["product_demand_outlook"],
                risk_level=RiskLevel.MODERATE,
                confidence=ConfidenceLevel.LOW,
                insights=[
                    EvidenceInsight(
                        indicator="Product Portfolio",
                        category="market_demand",
                        value="not provided",
                        benchmark=None,
                        impact="neutral",
                        narrative="Product and market demand data not submitted. Provide product lines and demand outlook.",
                        confidence=ConfidenceLevel.LOW,
                        data_source="inferred",
                    )
                ],
            )

        demand_scores = {
            "strong_growth": 90,
            "moderate_growth": 75,
            "stable": 60,
            "declining": 30,
        }
        if product_market.market_demand_outlook:
            d_score = demand_scores.get(product_market.market_demand_outlook.lower(), 55)
            scores.append(d_score)
            insights.append(
                EvidenceInsight(
                    indicator="Market Demand Outlook",
                    category="market_demand",
                    value=product_market.market_demand_outlook.replace("_", " "),
                    benchmark="moderate_growth",
                    impact="positive" if d_score >= 75 else "negative" if d_score < 50 else "neutral",
                    narrative=f"Market demand outlook assessed as {product_market.market_demand_outlook.replace('_', ' ')}.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="market_research",
                )
            )

        if product_market.sector_growth_rate_pct is not None:
            growth_score = _clamp(50 + product_market.sector_growth_rate_pct * 5, 0, 100)
            scores.append(growth_score)
            insights.append(
                EvidenceInsight(
                    indicator="Sector Growth Rate",
                    category="industry_tailwind",
                    value=f"{product_market.sector_growth_rate_pct:.1f}%",
                    benchmark="8%",
                    impact="positive" if product_market.sector_growth_rate_pct >= 8 else "neutral",
                    narrative=f"Industry sector growing at {product_market.sector_growth_rate_pct:.1f}% CAGR.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="industry_reports",
                )
            )

        if product_market.capacity_utilisation_pct is not None:
            util = product_market.capacity_utilisation_pct
            util_score = _clamp(50 + (util - 50) * 0.8, 0, 100) if util <= 90 else _clamp(100 - (util - 90) * 2, 0, 100)
            scores.append(util_score)
            insights.append(
                EvidenceInsight(
                    indicator="Capacity Utilisation",
                    category="operational_demand",
                    value=f"{util:.0f}%",
                    benchmark="75%",
                    impact="positive" if 70 <= util <= 90 else "negative",
                    narrative=(
                        f"Capacity utilisation at {util:.0f}% "
                        f"{'indicates healthy demand' if 70 <= util <= 90 else 'suggests under/over-utilisation risk'}."
                    ),
                    confidence=ConfidenceLevel.HIGH,
                    data_source="production_records",
                )
            )

        if product_market.order_book_months is not None:
            ob_score = _clamp(40 + product_market.order_book_months * 15, 0, 100)
            scores.append(ob_score)
            insights.append(
                EvidenceInsight(
                    indicator="Order Book Depth",
                    category="demand_visibility",
                    value=f"{product_market.order_book_months:.1f} months",
                    benchmark="3 months",
                    impact="positive" if product_market.order_book_months >= 3 else "negative",
                    narrative=f"Confirmed order book covers {product_market.order_book_months:.1f} months of production.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="order_management",
                )
            )

        product_names = [p.name for p in product_market.products[:4]]
        categories = list({p.category for p in product_market.products})
        max_share = max(p.revenue_share_pct for p in product_market.products)
        diversification_score = _clamp(100 - max(0, max_share - 40) * 1.5, 0, 100)
        scores.append(diversification_score)
        insights.append(
            EvidenceInsight(
                indicator="Product Portfolio",
                category="product_mix",
                value=", ".join(product_names),
                benchmark="diversified",
                impact="positive" if max_share <= 50 else "negative",
                narrative=(
                    f"{len(product_market.products)} product line(s) across {', '.join(categories)}. "
                    f"Largest product contributes {max_share:.0f}% of revenue."
                ),
                confidence=ConfidenceLevel.HIGH,
                data_source="product_catalog",
            )
        )

        if product_market.export_revenue_pct is not None and product_market.export_revenue_pct > 0:
            export_score = _clamp(55 + product_market.export_revenue_pct * 0.5, 0, 100)
            scores.append(export_score)
            insights.append(
                EvidenceInsight(
                    indicator="Export Revenue Share",
                    category="market_reach",
                    value=f"{product_market.export_revenue_pct:.0f}%",
                    benchmark="15%",
                    impact="positive",
                    narrative=f"Export revenue at {product_market.export_revenue_pct:.0f}% diversifies market exposure.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="export_records",
                )
            )

        if product_market.import_substitution_potential:
            scores.append(80)
            insights.append(
                EvidenceInsight(
                    indicator="Import Substitution",
                    category="policy_tailwind",
                    value="high potential",
                    benchmark=None,
                    impact="positive",
                    narrative="Products align with Make in India import substitution priorities.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="policy_alignment",
                )
            )

        if product_market.ev_supply_chain_exposure:
            scores.append(78)
            insights.append(
                EvidenceInsight(
                    indicator="EV Supply Chain",
                    category="growth_segment",
                    value="exposed",
                    benchmark=None,
                    impact="positive",
                    narrative="Exposure to EV/auto supply chain benefits from PLI and electrification tailwinds.",
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="sector_analysis",
                )
            )

        score = sum(scores) / len(scores) if scores else 55
        confidence = ConfidenceLevel.HIGH if product_market.order_book_months else ConfidenceLevel.MEDIUM
        return DimensionScore(
            dimension="product_demand_outlook",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["product_demand_outlook"],
            risk_level=_score_to_risk(score),
            confidence=confidence,
            insights=insights,
        )

    def _score_government_policy_alignment(self, fd, profile) -> DimensionScore:
        """Score dimension for government policy alignment (also builds detailed assessment separately)."""
        policy_assessment = self._build_government_policy_assessment(fd, profile)
        insights: list[EvidenceInsight] = []

        for pi in policy_assessment.policy_insights[:4]:
            impact = "positive" if pi.status == "enrolled" else "neutral" if pi.status == "not_applicable" else "negative" if pi.alignment_score < 40 else "neutral"
            if pi.status == "eligible":
                impact = "negative"
            insights.append(
                EvidenceInsight(
                    indicator=pi.name,
                    category="government_policy",
                    value=pi.status,
                    benchmark="enrolled",
                    impact=impact if pi.status != "recommended" else "positive",
                    narrative=pi.benefit_summary,
                    confidence=ConfidenceLevel.HIGH if pi.status == "enrolled" else ConfidenceLevel.MEDIUM,
                    data_source="government_policy_catalog",
                )
            )

        if policy_assessment.sector_tailwinds:
            insights.append(
                EvidenceInsight(
                    indicator="Sector Policy Tailwinds",
                    category="government_policy",
                    value=len(policy_assessment.sector_tailwinds),
                    benchmark=None,
                    impact="positive",
                    narrative="; ".join(policy_assessment.sector_tailwinds[:2]),
                    confidence=ConfidenceLevel.MEDIUM,
                    data_source="government_policy_catalog",
                )
            )

        score = policy_assessment.overall_alignment_score
        return DimensionScore(
            dimension="government_policy_alignment",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["government_policy_alignment"],
            risk_level=_score_to_risk(score),
            confidence=ConfidenceLevel.HIGH if fd.government_policy else ConfidenceLevel.MEDIUM,
            insights=insights,
        )

    def _build_government_policy_assessment(self, fd, profile) -> GovernmentPolicyAssessment:
        enrollment = fd.government_policy
        product_categories = [p.category for p in (fd.product_market.products if fd.product_market else [])]
        applicable = get_applicable_policies(profile.sector, product_categories)

        enrolled_codes = set(enrollment.enrolled_scheme_codes if enrollment else [])
        if profile.udyam_number and "UDYAM" not in enrolled_codes:
            enrolled_codes.add("UDYAM")

        pending = set(enrollment.pending_applications if enrollment else [])
        policy_insights: list[PolicyAlignmentInsight] = []
        alignment_scores: list[float] = []
        sector_tailwinds: list[str] = []
        financing_opportunities: list[str] = []

        for policy in applicable[:10]:
            if policy.code in enrolled_codes:
                status = "enrolled"
                align_score = 90 + policy.relevance_weight * 10
                action = None
                sector_tailwinds.append(f"{policy.name}: active enrollment")
            elif policy.code in pending:
                status = "recommended"
                align_score = 60 + policy.relevance_weight * 20
                action = f"Complete pending application for {policy.name}"
            else:
                status = "eligible"
                align_score = 40 + policy.relevance_weight * 30
                action = f"Apply for {policy.name} — {policy.benefits[0]}"

            policy_insights.append(
                PolicyAlignmentInsight(
                    code=policy.code,
                    name=policy.name,
                    status=status,
                    alignment_score=round(min(align_score, 100), 1),
                    benefit_summary=policy.description,
                    action_recommendation=action,
                )
            )
            alignment_scores.append(align_score if status == "enrolled" else align_score * 0.6)

            if status == "eligible" and policy.code in ("CGTMSE", "PMMY", "CLCSS", "SOLAR_ROOFTOP"):
                financing_opportunities.append(f"{policy.name}: {policy.benefits[0]}")

        if enrollment and enrollment.zed_certification_level:
            zed_bonus = {"bronze": 5, "silver": 10, "gold": 15, "diamond": 20}
            alignment_scores.append(70 + zed_bonus.get(enrollment.zed_certification_level.lower(), 0))

        if enrollment and enrollment.gst_filing_compliance_pct is not None:
            if enrollment.gst_filing_compliance_pct >= 95:
                alignment_scores.append(85)
            elif enrollment.gst_filing_compliance_pct < 70:
                alignment_scores.append(35)

        if fd.product_market and fd.product_market.ev_supply_chain_exposure:
            sector_tailwinds.append("PLI Auto & ACC Battery: EV supply chain policy tailwinds")
        if fd.product_market and fd.product_market.import_substitution_potential:
            sector_tailwinds.append("Make in India: import substitution policy support")

        overall = sum(alignment_scores) / len(alignment_scores) if alignment_scores else 50
        enrolled_count = sum(1 for p in policy_insights if p.status == "enrolled")
        eligible_count = sum(1 for p in policy_insights if p.status == "eligible")

        return GovernmentPolicyAssessment(
            overall_alignment_score=round(_clamp(overall, 0, 100), 1),
            enrolled_count=enrolled_count,
            eligible_unenrolled_count=eligible_count,
            policy_insights=policy_insights,
            sector_tailwinds=sector_tailwinds[:5],
            financing_opportunities=financing_opportunities[:5],
        )

    def _score_credit_history_debt_servicing(self, credit, acct) -> DimensionScore:
        """Score past debts, repayment track record, CRISIL rating, and debt servicing capacity."""
        insights: list[EvidenceInsight] = []
        scores: list[float] = []
        confidence = ConfidenceLevel.LOW

        if not credit:
            return DimensionScore(
                dimension="credit_history_debt_servicing",
                score=52.0,
                weight=self.DIMENSION_WEIGHTS["credit_history_debt_servicing"],
                risk_level=RiskLevel.MODERATE,
                confidence=ConfidenceLevel.LOW,
                insights=[
                    EvidenceInsight(
                        indicator="Credit Bureau Data",
                        category="credit_history",
                        value="not provided",
                        benchmark=None,
                        impact="neutral",
                        narrative=(
                            "No credit bureau data (CRISIL rating, past debts, repayment history). "
                            "Request commercial credit report for accurate debt servicing assessment."
                        ),
                        confidence=ConfidenceLevel.LOW,
                        data_source="inferred",
                    )
                ],
            )

        # CRISIL / agency rating
        if credit.crisil_rating:
            crisil_score = crisil_rating_to_score(credit.crisil_rating, credit.crisil_outlook)
            scores.append(crisil_score)
            outlook_text = f" ({credit.crisil_outlook} outlook)" if credit.crisil_outlook else ""
            agency = credit.rating_agency or "CRISIL"
            insights.append(
                EvidenceInsight(
                    indicator=f"{agency} Rating",
                    category="credit_rating",
                    value=f"{credit.crisil_rating}{outlook_text}",
                    benchmark="BBB+",
                    impact="positive" if crisil_score >= 68 else "negative" if crisil_score < 55 else "neutral",
                    narrative=(
                        f"{agency} rating of {credit.crisil_rating}{outlook_text} "
                        f"reflects {'strong' if crisil_score >= 77 else 'adequate' if crisil_score >= 63 else 'weak'} "
                        "creditworthiness for MSME lending."
                    ),
                    confidence=ConfidenceLevel.HIGH,
                    data_source="credit_rating_agency",
                )
            )
            confidence = ConfidenceLevel.HIGH
        elif credit.crisil_score is not None:
            scores.append(credit.crisil_score)
            insights.append(
                EvidenceInsight(
                    indicator="CRISIL-Equivalent Score",
                    category="credit_rating",
                    value=f"{credit.crisil_score:.0f}/100",
                    benchmark=65,
                    impact="positive" if credit.crisil_score >= 65 else "negative",
                    narrative=f"Numeric credit score of {credit.crisil_score:.0f}/100 from bureau assessment.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="credit_bureau",
                )
            )
            confidence = ConfidenceLevel.HIGH

        # CIBIL MSME Rank (CMR 1=best, 10=worst)
        if credit.commercial_credit_score is not None:
            cmr_score = _clamp(100 - (credit.commercial_credit_score - 1) * 10, 0, 100)
            scores.append(cmr_score)
            insights.append(
                EvidenceInsight(
                    indicator="CIBIL MSME Rank (CMR)",
                    category="credit_bureau",
                    value=credit.commercial_credit_score,
                    benchmark="1-3",
                    impact="positive" if credit.commercial_credit_score <= 3 else "negative" if credit.commercial_credit_score >= 7 else "neutral",
                    narrative=(
                        f"CIBIL MSME Rank CMR-{credit.commercial_credit_score} "
                        f"({'low risk' if credit.commercial_credit_score <= 3 else 'elevated risk' if credit.commercial_credit_score >= 7 else 'moderate risk'})."
                    ),
                    confidence=ConfidenceLevel.HIGH,
                    data_source="cibil_commercial",
                )
            )
            confidence = ConfidenceLevel.HIGH

        # Past debt repayment track record
        if credit.past_debts:
            closed = [d for d in credit.past_debts if d.status == "closed"]
            active = [d for d in credit.past_debts if d.status == "active"]
            distressed = [d for d in credit.past_debts if d.status in ("restructured", "written_off", "npa", "substandard")]

            if closed:
                repay_pcts = [d.repayment_completed_pct for d in closed if d.repayment_completed_pct is not None]
                avg_repay = sum(repay_pcts) / len(repay_pcts) if repay_pcts else 100
                closed_score = _clamp(avg_repay, 0, 100)
                scores.append(closed_score)
                insights.append(
                    EvidenceInsight(
                        indicator="Past Debt Repayment",
                        category="repayment_history",
                        value=f"{avg_repay:.0f}% avg completion",
                        benchmark="100%",
                        impact="positive" if avg_repay >= 95 else "negative",
                        narrative=(
                            f"{len(closed)} closed loan(s) with average {avg_repay:.0f}% principal repaid — "
                            f"{'strong' if avg_repay >= 95 else 'incomplete'} repayment track record."
                        ),
                        confidence=ConfidenceLevel.HIGH,
                        data_source="loan_history",
                    )
                )

            if active:
                total_outstanding = sum(d.outstanding_inr or 0 for d in active)
                insights.append(
                    EvidenceInsight(
                        indicator="Active Debt Facilities",
                        category="debt_profile",
                        value=f"{len(active)} loans, ₹{total_outstanding:,.0f} outstanding",
                        benchmark=None,
                        impact="neutral",
                        narrative=f"{len(active)} active loan facility(ies) with ₹{total_outstanding:,.0f} total outstanding.",
                        confidence=ConfidenceLevel.HIGH,
                        data_source="loan_history",
                    )
                )

            if distressed:
                distress_score = _clamp(40 - len(distressed) * 15, 0, 100)
                scores.append(distress_score)
                insights.append(
                    EvidenceInsight(
                        indicator="Distressed Debt History",
                        category="credit_risk",
                        value=len(distressed),
                        benchmark=0,
                        impact="negative",
                        narrative=(
                            f"{len(distressed)} loan(s) with restructured/NPA/written-off status — "
                            "material credit history concern."
                        ),
                        confidence=ConfidenceLevel.HIGH,
                        data_source="loan_history",
                    )
                )

        # EMI repayment history
        if credit.repayment_history:
            total_emis = len(credit.repayment_history)
            on_time = sum(1 for r in credit.repayment_history if r.status == "on_time")
            missed = sum(1 for r in credit.repayment_history if r.status == "missed")
            on_time_pct = on_time / total_emis * 100 if total_emis > 0 else 0
            emi_score = _clamp(on_time_pct - missed * 10, 0, 100)
            scores.append(emi_score)
            insights.append(
                EvidenceInsight(
                    indicator="EMI Repayment Discipline",
                    category="repayment_history",
                    value=f"{on_time_pct:.0f}% on-time ({total_emis} EMIs)",
                    benchmark="95%",
                    impact="positive" if on_time_pct >= 95 else "negative" if on_time_pct < 80 else "neutral",
                    narrative=(
                        f"{on_time_pct:.0f}% of {total_emis} EMIs paid on time"
                        f"{f'; {missed} missed payment(s)' if missed else ''}."
                    ),
                    confidence=ConfidenceLevel.HIGH,
                    data_source="repayment_records",
                )
            )
            confidence = ConfidenceLevel.HIGH
        elif credit.emi_on_time_pct_12m is not None:
            emi_score = _clamp(credit.emi_on_time_pct_12m, 0, 100)
            scores.append(emi_score)
            insights.append(
                EvidenceInsight(
                    indicator="EMI On-Time Rate (12M)",
                    category="repayment_history",
                    value=f"{credit.emi_on_time_pct_12m:.0f}%",
                    benchmark="95%",
                    impact="positive" if credit.emi_on_time_pct_12m >= 95 else "negative",
                    narrative=f"{credit.emi_on_time_pct_12m:.0f}% EMI on-time payment rate over trailing 12 months.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="bank_repayment_data",
                )
            )

        # Debt Service Coverage Ratio
        dscr = credit.debt_service_coverage_ratio
        if dscr is None and acct.net_profit_inr and credit.past_debts:
            annual_emi = sum(
                (d.emi_amount_inr or 0) * 12
                for d in credit.past_debts
                if d.status == "active" and d.emi_amount_inr
            )
            if annual_emi > 0:
                dscr = acct.net_profit_inr / annual_emi

        if dscr is not None:
            dscr_score = _clamp(30 + dscr * 25, 0, 100)
            scores.append(dscr_score)
            insights.append(
                EvidenceInsight(
                    indicator="Debt Service Coverage Ratio",
                    category="debt_servicing",
                    value=round(dscr, 2),
                    benchmark=1.25,
                    impact="positive" if dscr >= 1.25 else "negative" if dscr < 1.0 else "neutral",
                    narrative=(
                        f"DSCR of {dscr:.2f}x indicates "
                        f"{'comfortable' if dscr >= 1.5 else 'adequate' if dscr >= 1.25 else 'tight' if dscr >= 1.0 else 'insufficient'} "
                        "debt servicing capacity."
                    ),
                    confidence=ConfidenceLevel.HIGH,
                    data_source="financial_analysis",
                )
            )

        # Restructuring / NPA / write-off counters
        if credit.restructured_loans_count > 0:
            scores.append(_clamp(50 - credit.restructured_loans_count * 12, 0, 100))
            insights.append(
                EvidenceInsight(
                    indicator="Restructured Loans",
                    category="credit_risk",
                    value=credit.restructured_loans_count,
                    benchmark=0,
                    impact="negative",
                    narrative=f"{credit.restructured_loans_count} restructured loan(s) in credit history.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="loan_history",
                )
            )

        if credit.written_off_loans_count > 0:
            scores.append(20)
            insights.append(
                EvidenceInsight(
                    indicator="Written-Off Loans",
                    category="credit_risk",
                    value=credit.written_off_loans_count,
                    benchmark=0,
                    impact="negative",
                    narrative=f"{credit.written_off_loans_count} written-off loan(s) — severe credit history flag.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="loan_history",
                )
            )

        if credit.npa_incidents_5y > 0:
            scores.append(_clamp(45 - credit.npa_incidents_5y * 18, 0, 100))
            insights.append(
                EvidenceInsight(
                    indicator="NPA Incidents (5Y)",
                    category="credit_risk",
                    value=credit.npa_incidents_5y,
                    benchmark=0,
                    impact="negative",
                    narrative=f"{credit.npa_incidents_5y} NPA/substandard incident(s) in past 5 years.",
                    confidence=ConfidenceLevel.HIGH,
                    data_source="rbi_cibil_records",
                )
            )

        score = sum(scores) / len(scores) if scores else 52
        return DimensionScore(
            dimension="credit_history_debt_servicing",
            score=round(score, 1),
            weight=self.DIMENSION_WEIGHTS["credit_history_debt_servicing"],
            risk_level=_score_to_risk(score),
            confidence=confidence,
            insights=insights,
        )

    def _identify_data_gaps(self, fd, carbon_data) -> list[DataGap]:
        """Identify missing or incomplete inputs that reduce assessment confidence."""
        gaps: list[DataGap] = []

        def gap(field: str, category: str, severity: str, message: str, rec: str, dims: list[str]):
            gaps.append(DataGap(
                field=field, category=category, severity=severity,
                message=message, recommendation=rec, impacts_dimensions=dims,
            ))

        if not fd.credit_bureau:
            gap("credit_bureau", "credit_data", "high",
                "No CRISIL rating or debt repayment history provided.",
                "Obtain commercial credit report with CRISIL/ICRA rating and loan repayment track record.",
                ["credit_history_debt_servicing", "financial_resilience"])
        else:
            cb = fd.credit_bureau
            if not cb.crisil_rating and cb.crisil_score is None:
                gap("credit_bureau.crisil_rating", "credit_data", "high",
                    "CRISIL or equivalent credit rating missing.",
                    "Request CRISIL/ICRA/CARE rating for the borrowing entity.",
                    ["credit_history_debt_servicing"])
            if not cb.past_debts and not cb.repayment_history:
                gap("credit_bureau.past_debts", "credit_data", "medium",
                    "No past debt or loan repayment records submitted.",
                    "Provide loan history including closed, active, and any restructured facilities.",
                    ["credit_history_debt_servicing"])
            if cb.debt_service_coverage_ratio is None and not cb.past_debts:
                gap("credit_bureau.debt_service_coverage_ratio", "credit_data", "medium",
                    "Debt Service Coverage Ratio (DSCR) not available.",
                    "Calculate DSCR from EBITDA and annual debt service obligations.",
                    ["credit_history_debt_servicing", "financial_resilience"])

        if not fd.founder:
            gap("founder", "management", "medium",
                "Founder profile not provided for key-person risk assessment.",
                "Submit founder experience, CIBIL score, and management team details.",
                ["founder_capability"])
        elif fd.founder.cibil_score is None:
            gap("founder.cibil_score", "management", "medium",
                "Founder personal CIBIL score missing.",
                "Pull founder CIBIL report for key-person credit assessment.",
                ["founder_capability"])

        if not fd.market_sentiment:
            gap("market_sentiment", "reputation", "medium",
                "Market sentiment and reputation data not provided.",
                "Collect NPS, online reviews, and media sentiment metrics.",
                ["market_sentiment"])
        elif fd.market_sentiment.customer_nps is None and fd.market_sentiment.overall_sentiment_score is None:
            gap("market_sentiment.nps", "reputation", "low",
                "No quantitative sentiment score (NPS or composite) available.",
                "Run customer NPS survey or aggregate review sentiment.",
                ["market_sentiment"])

        if not fd.product_market or not fd.product_market.products:
            gap("product_market", "market_demand", "medium",
                "Product portfolio and market demand data missing.",
                "Submit product lines, order book depth, and sector demand outlook.",
                ["product_demand_outlook"])
        elif fd.product_market.order_book_months is None:
            gap("product_market.order_book_months", "market_demand", "low",
                "Order book depth not specified.",
                "Provide confirmed order pipeline in months of production.",
                ["product_demand_outlook"])

        if not fd.cash_flows and not (carbon_data and carbon_data.get("transactions_summary")):
            gap("cash_flows", "financial", "medium",
                "No cash flow data or CI transaction analytics available.",
                "Submit monthly cash flows or link Carbon Intelligence MSME ID.",
                ["cash_flow_health"])

        if not fd.payment_records and not (carbon_data and carbon_data.get("transactions_summary")):
            gap("payment_records", "financial", "low",
                "Trade payment behaviour records not submitted.",
                "Provide supplier/customer payment history for behaviour scoring.",
                ["payment_behaviour"])

        if not fd.profile.msme_id or not carbon_data:
            gap("carbon_intelligence", "sustainability", "medium",
                "Carbon Intelligence data not linked.",
                "Register MSME on ci.sustainow.in and provide msme_id for carbon risk enrichment.",
                ["carbon_transition_risk", "cash_flow_health"])

        if not fd.government_policy and not fd.profile.udyam_number:
            gap("government_policy", "policy", "low",
                "Government scheme enrollment status unknown.",
                "Confirm Udyam registration and enrolled schemes (CGTMSE, CLCSS, etc.).",
                ["government_policy_alignment"])

        if not fd.bank_statement_summary:
            gap("bank_statement_summary", "alternative_data", "low",
                "Bank statement aggregates not provided.",
                "Submit average balance and bounce count for liquidity cross-check.",
                ["alternative_data_signals"])

        if fd.accounting.net_profit_inr is None:
            gap("accounting.net_profit_inr", "financial", "low",
                "Net profit not provided — DSCR and margin analysis limited.",
                "Include net profit in accounting snapshot.",
                ["financial_resilience", "credit_history_debt_servicing"])

        return gaps

    def _build_risk_indicators(
        self, dimensions: list[DimensionScore], acct, carbon_data, fd=None
    ) -> list[RiskIndicator]:
        indicators: list[RiskIndicator] = []

        for dim in dimensions:
            if dim.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL, RiskLevel.ELEVATED):
                worst = min(dim.insights, key=lambda i: 0 if i.impact == "negative" else 1, default=None)
                if worst and worst.impact == "negative":
                    indicators.append(
                        RiskIndicator(
                            code=f"RISK_{dim.dimension.upper()}",
                            label=f"{dim.dimension.replace('_', ' ').title()} Risk",
                            severity=dim.risk_level,
                            description=worst.narrative,
                            evidence=[f"{worst.indicator}: {worst.value}"],
                            recommended_action=self._recommendation(dim.dimension),
                        )
                    )

        if acct.current_liabilities_inr > 0:
            cr = acct.current_assets_inr / acct.current_liabilities_inr
            if cr < 1.0:
                indicators.append(
                    RiskIndicator(
                        code="RISK_LIQUIDITY_SHORTFALL",
                        label="Liquidity Shortfall",
                        severity=RiskLevel.HIGH if cr < 0.8 else RiskLevel.ELEVATED,
                        description=f"Current ratio {cr:.2f} below 1.0 indicates potential working capital stress.",
                        evidence=[f"Current assets: ₹{acct.current_assets_inr:,.0f}", f"Current liabilities: ₹{acct.current_liabilities_inr:,.0f}"],
                        recommended_action="Review working capital facilities and receivables collection cycle.",
                    )
                )

        if carbon_data and carbon_data.get("carbon_summary"):
            energy = carbon_data["carbon_summary"].get("energyCostSharePct", 0)
            if energy > 15:
                indicators.append(
                    RiskIndicator(
                        code="RISK_ENERGY_EXPOSURE",
                        label="Energy Cost Exposure",
                        severity=RiskLevel.ELEVATED,
                        description=f"Energy costs at {energy:.1f}% of spend create margin vulnerability to price shocks.",
                        evidence=[f"Energy cost share: {energy:.1f}%"],
                        recommended_action="Explore energy efficiency financing and renewable transition options.",
                    )
                )

        if fd and fd.founder:
            if fd.founder.prior_defaults > 0:
                indicators.append(
                    RiskIndicator(
                        code="RISK_FOUNDER_DEFAULT",
                        label="Founder Credit Default History",
                        severity=RiskLevel.HIGH,
                        description=f"Founder has {fd.founder.prior_defaults} prior loan default(s) on record.",
                        evidence=[f"Prior defaults: {fd.founder.prior_defaults}"],
                        recommended_action="Obtain personal guarantee assessment and enhanced monitoring.",
                    )
                )
            if fd.founder.cibil_score and fd.founder.cibil_score < 650:
                indicators.append(
                    RiskIndicator(
                        code="RISK_FOUNDER_CIBIL",
                        label="Low Founder CIBIL Score",
                        severity=RiskLevel.ELEVATED,
                        description=f"Founder CIBIL score of {fd.founder.cibil_score} below acceptable threshold.",
                        evidence=[f"CIBIL: {fd.founder.cibil_score}"],
                        recommended_action="Review personal financial statements and co-applicant options.",
                    )
                )

        if fd and fd.market_sentiment and fd.market_sentiment.litigation_count_3y > 0:
            indicators.append(
                RiskIndicator(
                    code="RISK_LITIGATION",
                    label="Active Litigation",
                    severity=RiskLevel.ELEVATED,
                    description=f"{fd.market_sentiment.litigation_count_3y} litigation case(s) may impact cash flows and reputation.",
                    evidence=[f"Cases: {fd.market_sentiment.litigation_count_3y}"],
                    recommended_action="Obtain legal opinion on materiality and contingent liabilities.",
                )
            )

        if fd and fd.product_market and fd.product_market.market_demand_outlook == "declining":
            indicators.append(
                RiskIndicator(
                    code="RISK_DECLINING_DEMAND",
                    label="Declining Market Demand",
                    severity=RiskLevel.HIGH,
                    description="Product market demand outlook is declining — revenue at risk.",
                    evidence=[f"Outlook: {fd.product_market.market_demand_outlook}"],
                    recommended_action="Assess product diversification and pivot strategy.",
                )
            )

        if fd and fd.credit_bureau:
            cb = fd.credit_bureau
            if cb.crisil_rating:
                crisil_s = crisil_rating_to_score(cb.crisil_rating, cb.crisil_outlook)
                if crisil_s < 55:
                    indicators.append(
                        RiskIndicator(
                            code="RISK_LOW_CRISIL",
                            label="Low CRISIL Rating",
                            severity=RiskLevel.HIGH if crisil_s < 45 else RiskLevel.ELEVATED,
                            description=f"CRISIL rating {cb.crisil_rating} indicates below-investment-grade credit risk.",
                            evidence=[f"CRISIL: {cb.crisil_rating}", f"Outlook: {cb.crisil_outlook or 'N/A'}"],
                            recommended_action="Enhanced credit monitoring and collateral requirements recommended.",
                        )
                    )
            if cb.npa_incidents_5y > 0 or cb.written_off_loans_count > 0:
                indicators.append(
                    RiskIndicator(
                        code="RISK_NPA_HISTORY",
                        label="NPA / Write-Off History",
                        severity=RiskLevel.HIGH,
                        description="Prior NPA or loan write-off incidents in credit history.",
                        evidence=[
                            f"NPA incidents: {cb.npa_incidents_5y}",
                            f"Written off: {cb.written_off_loans_count}",
                        ],
                        recommended_action="Obtain detailed explanation and recovery plan before sanction.",
                    )
                )
            if cb.commercial_credit_score and cb.commercial_credit_score >= 7:
                indicators.append(
                    RiskIndicator(
                        code="RISK_HIGH_CMR",
                        label="High CIBIL MSME Rank",
                        severity=RiskLevel.ELEVATED,
                        description=f"CIBIL MSME Rank CMR-{cb.commercial_credit_score} indicates elevated commercial credit risk.",
                        evidence=[f"CMR: {cb.commercial_credit_score}"],
                        recommended_action="Review bureau report for delinquencies and overdue facilities.",
                    )
                )
            distressed = [d for d in cb.past_debts if d.status in ("restructured", "npa", "substandard")]
            if distressed:
                indicators.append(
                    RiskIndicator(
                        code="RISK_DISTRESSED_DEBT",
                        label="Distressed Debt Facilities",
                        severity=RiskLevel.HIGH,
                        description=f"{len(distressed)} loan(s) currently or previously in distressed status.",
                        evidence=[d.lender_name for d in distressed[:3]],
                        recommended_action="Verify current SMA/NPA classification with lending banks.",
                    )
                )

        return indicators[:12]

    def _recommendation(self, dimension: str) -> str:
        recs = {
            "financial_resilience": "Strengthen balance sheet through debt restructuring or equity infusion.",
            "cash_flow_health": "Implement cash flow forecasting and optimise receivables/payables cycles.",
            "operational_stability": "Review cost structure and operational efficiency programmes.",
            "payment_behaviour": "Set up payment reminders and consider supply chain finance solutions.",
            "carbon_transition_risk": "Commission carbon assessment and develop transition roadmap.",
            "alternative_data_signals": "Diversify supplier and customer base to reduce concentration risk.",
            "founder_capability": "Strengthen management team depth and document succession planning.",
            "market_sentiment": "Address customer satisfaction gaps and monitor public reputation.",
            "product_demand_outlook": "Diversify product portfolio and secure long-term order commitments.",
            "government_policy_alignment": "Enroll in eligible government schemes (CGTMSE, CLCSS, PLI) to reduce financing cost.",
            "credit_history_debt_servicing": "Improve EMI discipline and reduce leverage to strengthen CRISIL rating outlook.",
        }
        return recs.get(dimension, "Conduct detailed due diligence.")

    def _build_key_insights(
        self, dimensions: list[DimensionScore], risks: list[RiskIndicator]
    ) -> list[str]:
        insights: list[str] = []

        best = max(dimensions, key=lambda d: d.score)
        worst = min(dimensions, key=lambda d: d.score)
        insights.append(
            f"Strongest dimension: {best.dimension.replace('_', ' ').title()} (score: {best.score})"
        )
        insights.append(
            f"Weakest dimension: {worst.dimension.replace('_', ' ').title()} (score: {worst.score})"
        )

        for dim in dimensions:
            for ev in dim.insights:
                if ev.impact == "negative" and ev.confidence in (ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM):
                    insights.append(ev.narrative)
                    if len(insights) >= 6:
                        break
            if len(insights) >= 6:
                break

        if risks:
            insights.append(f"{len(risks)} risk indicator(s) flagged for review.")

        return insights[:8]

    def _identify_green_finance_opportunities(
        self, dimensions: list[DimensionScore], carbon_data
    ) -> list[str]:
        opportunities: list[str] = []

        carbon_dim = next((d for d in dimensions if d.dimension == "carbon_transition_risk"), None)
        if carbon_dim and carbon_dim.score < 70:
            opportunities.append(
                "Energy efficiency term loan: High energy cost exposure suggests ROI-positive efficiency investments."
            )
            opportunities.append(
                "Solar rooftop financing: Scope 2 emissions reduction opportunity via renewable energy transition."
            )

        if carbon_data and carbon_data.get("reports_overview"):
            reports = carbon_data["reports_overview"]
            if not reports.get("brsrLiteReady"):
                opportunities.append(
                    "Sustainability-linked loan: BRSR readiness gap can be addressed through green finance covenants."
                )

        op_dim = next((d for d in dimensions if d.dimension == "operational_stability"), None)
        if op_dim and op_dim.score >= 65:
            opportunities.append(
                "Working capital green overdraft: Stable operations support short-term sustainable procurement finance."
            )

        return opportunities[:5]

    def _build_carbon_summary(
        self, carbon_data: dict[str, Any] | None, msme_id: str | None
    ) -> CarbonIntelligenceSummary | None:
        if not carbon_data:
            return None

        carbon = carbon_data.get("carbon_summary", {})
        reports = carbon_data.get("reports_overview", {})
        txn = carbon_data.get("transactions_summary", {})

        intensity = carbon.get("carbonIntensityKgPerRevenue", 0.35)
        transition_risk = _clamp(100 - intensity * 80, 0, 100)

        return CarbonIntelligenceSummary(
            source="ci.sustainow.in",
            msme_id=msme_id,
            total_emissions_tco2e=carbon.get("totalEmissionsTco2e"),
            scope1_tco2e=carbon.get("scope1Tco2e"),
            scope2_tco2e=carbon.get("scope2Tco2e"),
            scope3_tco2e=carbon.get("scope3Tco2e"),
            carbon_intensity=intensity,
            transition_risk_score=round(transition_risk, 1),
            energy_cost_exposure_pct=carbon.get("energyCostSharePct") or txn.get("energySpendSharePct"),
            reporting_readiness=reports.get("reportingReadiness"),
            data_freshness=carbon.get("assessmentDate"),
            mock_data=carbon_data.get("mock_data", False),
        )

    def _audience_summary(
        self, audience: AudienceRole, score: float, risks: list[RiskIndicator]
    ) -> str:
        risk_count = len(risks)
        grade = _score_to_grade(score)

        summaries = {
            AudienceRole.CREDIT_TEAM: (
                f"Credit assessment: Financial Health Score {score:.0f}/100 (Grade {grade}). "
                f"{'Approve with standard terms' if score >= 70 else 'Recommend enhanced due diligence' if score >= 50 else 'High caution advised'}. "
                f"{risk_count} risk flag(s) identified."
            ),
            AudienceRole.RISK_TEAM: (
                f"Risk monitoring: Score {score:.0f}/100 with {risk_count} active risk indicator(s). "
                f"Priority review: {', '.join(r.label for r in risks[:3]) or 'none'}."
            ),
            AudienceRole.RELATIONSHIP_MANAGER: (
                f"Relationship view: Client health at {score:.0f}/100 (Grade {grade}). "
                f"{'Strong candidate for cross-sell' if score >= 75 else 'Proactive engagement recommended'}. "
                f"Green finance opportunities available."
            ),
            AudienceRole.PORTFOLIO_ANALYST: (
                f"Portfolio intelligence: MSME scores {score:.0f}/100, "
                f"risk tier {_score_to_risk(score).value}. "
                f"Benchmark against portfolio median recommended."
            ),
        }
        return summaries.get(audience, summaries[AudienceRole.CREDIT_TEAM])

    def _data_sources(self, fd, carbon_data) -> list[str]:
        sources = ["accounting_records", "msme_profile"]
        if fd.cash_flows:
            sources.append("cash_flows")
        if fd.utility_bills:
            sources.append("utility_bills")
        if fd.payment_records:
            sources.append("payment_records")
        if fd.bank_statement_summary:
            sources.append("bank_statements")
        if carbon_data:
            sources.append("ci.sustainow.in")
        if fd.founder:
            sources.append("founder_profile")
        if fd.market_sentiment:
            sources.extend(["sentiment_analysis", "public_reviews", "gst_portal"])
        if fd.product_market and fd.product_market.products:
            sources.append("product_catalog")
        if fd.government_policy or fd.profile.udyam_number:
            sources.append("government_policy_catalog")
        if fd.credit_bureau:
            sources.extend(["credit_rating_agency", "cibil_commercial", "loan_history", "repayment_records"])
        return sources


scoring_engine = ScoringEngine()
