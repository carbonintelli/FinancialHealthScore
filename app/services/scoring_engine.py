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
    DimensionScore,
    EvidenceInsight,
    FinancialHealthScoreResult,
    RiskIndicator,
    RiskLevel,
)


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
        "financial_resilience": 0.30,
        "cash_flow_health": 0.20,
        "operational_stability": 0.15,
        "payment_behaviour": 0.15,
        "carbon_transition_risk": 0.10,
        "alternative_data_signals": 0.10,
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

        overall = sum(d.score * d.weight for d in dimensions)
        confidences = [d.confidence for d in dimensions]
        overall_confidence = _avg_confidence(confidences)

        risk_indicators = self._build_risk_indicators(dimensions, acct, carbon_data)
        key_insights = self._build_key_insights(dimensions, risk_indicators)
        green_opportunities = self._identify_green_finance_opportunities(dimensions, carbon_data)
        carbon_summary = self._build_carbon_summary(carbon_data, profile.msme_id)
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
            audience_summary=audience_summary,
            metadata={
                "sector": profile.sector,
                "audience": request.audience.value,
                "data_sources": self._data_sources(fd, carbon_data),
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

    def _build_risk_indicators(
        self, dimensions: list[DimensionScore], acct, carbon_data
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

        return indicators[:8]

    def _recommendation(self, dimension: str) -> str:
        recs = {
            "financial_resilience": "Strengthen balance sheet through debt restructuring or equity infusion.",
            "cash_flow_health": "Implement cash flow forecasting and optimise receivables/payables cycles.",
            "operational_stability": "Review cost structure and operational efficiency programmes.",
            "payment_behaviour": "Set up payment reminders and consider supply chain finance solutions.",
            "carbon_transition_risk": "Commission carbon assessment and develop transition roadmap.",
            "alternative_data_signals": "Diversify supplier and customer base to reduce concentration risk.",
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
        return sources


scoring_engine = ScoringEngine()
