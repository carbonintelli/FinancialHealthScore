"""Advanced scoring dimensions: ESG, supply chain, insurance, geographic, peer benchmark."""

from __future__ import annotations

from app.data.geographic_risk import geographic_risk_score
from app.data.sector_benchmarks import estimate_percentile, get_sector_benchmark
from app.models.schemas import ConfidenceLevel, DimensionScore, EvidenceInsight, RiskLevel


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


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


class AdvancedScoring:
    WEIGHTS = {
        "esg_disclosure": 0.04,
        "supply_chain_resilience": 0.04,
        "insurance_business_continuity": 0.03,
        "geographic_risk": 0.03,
        "peer_benchmark": 0.03,
    }

    def score_esg_disclosure(self, esg, carbon_data, weight: float) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []

        if not esg:
            brsr = carbon_data and carbon_data.get("reports_overview", {}).get("brsrLiteReady")
            if brsr is False:
                return DimensionScore(
                    dimension="esg_disclosure",
                    score=45.0,
                    weight=weight,
                    risk_level=RiskLevel.ELEVATED,
                    confidence=ConfidenceLevel.MEDIUM,
                    insights=[EvidenceInsight(
                        indicator="BRSR Readiness",
                        category="esg_disclosure",
                        value="not ready",
                        benchmark="BRSR Lite",
                        impact="negative",
                        narrative="Carbon Intelligence indicates BRSR Lite not ready — ESG disclosure gap.",
                        confidence=ConfidenceLevel.MEDIUM,
                        data_source="ci.sustainow.in",
                    )],
                )
            return DimensionScore(
                dimension="esg_disclosure",
                score=50.0,
                weight=weight,
                risk_level=RiskLevel.MODERATE,
                confidence=ConfidenceLevel.LOW,
                insights=[EvidenceInsight(
                    indicator="ESG Disclosure",
                    category="esg_disclosure",
                    value="not provided",
                    benchmark=None,
                    impact="neutral",
                    narrative="No ESG/BRSR disclosure data submitted.",
                    confidence=ConfidenceLevel.LOW,
                    data_source="inferred",
                )],
            )

        if esg.brsr_lite_ready:
            scores.append(85)
            insights.append(EvidenceInsight(
                indicator="BRSR Lite Ready",
                category="esg_disclosure",
                value="ready",
                benchmark="ready",
                impact="positive",
                narrative="BRSR Lite disclosure readiness confirmed.",
                confidence=ConfidenceLevel.HIGH,
                data_source="esg_disclosure",
            ))
        if esg.ghg_inventory_completed:
            scores.append(80)
            insights.append(EvidenceInsight(
                indicator="GHG Inventory",
                category="esg_disclosure",
                value="completed",
                benchmark="completed",
                impact="positive",
                narrative="GHG Protocol-aligned inventory completed.",
                confidence=ConfidenceLevel.HIGH,
                data_source="esg_disclosure",
            ))
        if esg.esg_report_published:
            scores.append(78)
            insights.append(EvidenceInsight(
                indicator="ESG Report",
                category="esg_disclosure",
                value=esg.esg_report_year or "published",
                benchmark="annual",
                impact="positive",
                narrative="Published ESG/sustainability report.",
                confidence=ConfidenceLevel.HIGH,
                data_source="esg_disclosure",
            ))
        if esg.disclosure_score is not None:
            scores.append(_clamp(esg.disclosure_score, 0, 100))
            insights.append(EvidenceInsight(
                indicator="ESG Disclosure Score",
                category="esg_disclosure",
                value=f"{esg.disclosure_score:.0f}/100",
                benchmark=70,
                impact="positive" if esg.disclosure_score >= 70 else "negative",
                narrative=f"Composite ESG disclosure score: {esg.disclosure_score:.0f}/100.",
                confidence=ConfidenceLevel.HIGH,
                data_source="esg_assessment",
            ))
        if esg.supplier_esg_program:
            scores.append(75)
            insights.append(EvidenceInsight(
                indicator="Supplier ESG Program",
                category="esg_disclosure",
                value="active",
                benchmark="active",
                impact="positive",
                narrative="Supplier ESG engagement program in place.",
                confidence=ConfidenceLevel.MEDIUM,
                data_source="esg_disclosure",
            ))

        score = sum(scores) / len(scores) if scores else 50
        return DimensionScore(
            dimension="esg_disclosure",
            score=round(score, 1),
            weight=weight,
            risk_level=_score_to_risk(score),
            confidence=ConfidenceLevel.HIGH if len(scores) >= 2 else ConfidenceLevel.MEDIUM,
            insights=insights,
        )

    def score_supply_chain_resilience(self, supply_chain, product_market, carbon_data, weight: float) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []

        if not supply_chain:
            txn = carbon_data.get("transactions_summary", {}) if carbon_data else {}
            if txn:
                sup = txn.get("supplierConcentrationTop3Pct", 50)
                cust = txn.get("customerConcentrationTop3Pct", 50)
                conc_score = _clamp(100 - max(sup, cust) * 0.8, 0, 100)
                return DimensionScore(
                    dimension="supply_chain_resilience",
                    score=round(conc_score, 1),
                    weight=weight,
                    risk_level=_score_to_risk(conc_score),
                    confidence=ConfidenceLevel.MEDIUM,
                    insights=[EvidenceInsight(
                        indicator="Concentration Risk (CI)",
                        category="supply_chain",
                        value=f"suppliers {sup:.0f}%, customers {cust:.0f}%",
                        benchmark="30%",
                        impact="negative" if max(sup, cust) > 45 else "neutral",
                        narrative="Supply chain stress estimated from Carbon Intelligence transaction concentration.",
                        confidence=ConfidenceLevel.MEDIUM,
                        data_source="ci.sustainow.in",
                    )],
                )
            return DimensionScore(
                dimension="supply_chain_resilience",
                score=55.0,
                weight=weight,
                risk_level=RiskLevel.MODERATE,
                confidence=ConfidenceLevel.LOW,
                insights=[EvidenceInsight(
                    indicator="Supply Chain Profile",
                    category="supply_chain",
                    value="not provided",
                    benchmark=None,
                    impact="neutral",
                    narrative="Submit supply chain profile for stress testing.",
                    confidence=ConfidenceLevel.LOW,
                    data_source="inferred",
                )],
            )

        if supply_chain.key_supplier_count is not None:
            div_score = _clamp(40 + supply_chain.key_supplier_count * 3, 0, 100)
            scores.append(div_score)
            insights.append(EvidenceInsight(
                indicator="Supplier Base Diversity",
                category="supply_chain",
                value=supply_chain.key_supplier_count,
                benchmark=">=10",
                impact="positive" if supply_chain.key_supplier_count >= 10 else "negative",
                narrative=f"{supply_chain.key_supplier_count} active suppliers in network.",
                confidence=ConfidenceLevel.HIGH,
                data_source="supply_chain_records",
            ))

        if supply_chain.single_source_dependency_pct is not None:
            dep = supply_chain.single_source_dependency_pct
            scores.append(_clamp(100 - max(0, dep - 20) * 2, 0, 100))
            insights.append(EvidenceInsight(
                indicator="Single-Source Dependency",
                category="supply_chain",
                value=f"{dep:.0f}%",
                benchmark="20%",
                impact="negative" if dep > 30 else "positive",
                narrative=f"{dep:.0f}% of inputs from single-source suppliers.",
                confidence=ConfidenceLevel.HIGH,
                data_source="supply_chain_records",
            ))

        if supply_chain.inventory_days is not None:
            inv_score = _clamp(50 + (45 - abs(supply_chain.inventory_days - 45)) * 0.8, 0, 100)
            scores.append(inv_score)
            insights.append(EvidenceInsight(
                indicator="Inventory Days",
                category="supply_chain",
                value=supply_chain.inventory_days,
                benchmark="30-60",
                impact="positive" if 25 <= supply_chain.inventory_days <= 60 else "negative",
                narrative=f"Inventory covers {supply_chain.inventory_days:.0f} days of operations.",
                confidence=ConfidenceLevel.MEDIUM,
                data_source="inventory_records",
            ))

        # Stress scenario results
        if supply_chain.stress_scenario_survival_months is not None:
            stress_score = _clamp(30 + supply_chain.stress_scenario_survival_months * 15, 0, 100)
            scores.append(stress_score)
            insights.append(EvidenceInsight(
                indicator="Stress Test Survival",
                category="supply_chain",
                value=f"{supply_chain.stress_scenario_survival_months:.1f} months",
                benchmark="3 months",
                impact="positive" if supply_chain.stress_scenario_survival_months >= 3 else "negative",
                narrative=(
                    f"Under 30% revenue shock scenario, operations sustainable for "
                    f"{supply_chain.stress_scenario_survival_months:.1f} months."
                ),
                confidence=ConfidenceLevel.HIGH,
                data_source="stress_testing",
            ))

        if supply_chain.alternate_suppliers_identified_pct is not None:
            scores.append(_clamp(supply_chain.alternate_suppliers_identified_pct, 0, 100))
            insights.append(EvidenceInsight(
                indicator="Alternate Suppliers",
                category="supply_chain",
                value=f"{supply_chain.alternate_suppliers_identified_pct:.0f}%",
                benchmark="70%",
                impact="positive" if supply_chain.alternate_suppliers_identified_pct >= 70 else "negative",
                narrative=f"{supply_chain.alternate_suppliers_identified_pct:.0f}% of critical inputs have alternate suppliers.",
                confidence=ConfidenceLevel.MEDIUM,
                data_source="supply_chain_records",
            ))

        score = sum(scores) / len(scores) if scores else 55
        return DimensionScore(
            dimension="supply_chain_resilience",
            score=round(score, 1),
            weight=weight,
            risk_level=_score_to_risk(score),
            confidence=ConfidenceLevel.HIGH if supply_chain.stress_scenario_survival_months else ConfidenceLevel.MEDIUM,
            insights=insights,
        )

    def score_insurance(self, insurance, weight: float) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []

        if not insurance:
            return DimensionScore(
                dimension="insurance_business_continuity",
                score=52.0,
                weight=weight,
                risk_level=RiskLevel.MODERATE,
                confidence=ConfidenceLevel.LOW,
                insights=[EvidenceInsight(
                    indicator="Insurance Coverage",
                    category="business_continuity",
                    value="not provided",
                    benchmark=None,
                    impact="neutral",
                    narrative="Insurance coverage data not submitted — business continuity risk unassessed.",
                    confidence=ConfidenceLevel.LOW,
                    data_source="inferred",
                )],
            )

        coverage_types = []
        if insurance.property_insurance:
            coverage_types.append("property")
            scores.append(85)
        if insurance.machinery_breakdown_cover:
            coverage_types.append("machinery")
            scores.append(80)
        if insurance.business_interruption_cover:
            coverage_types.append("business_interruption")
            scores.append(88)
        if insurance.liability_insurance:
            coverage_types.append("liability")
            scores.append(82)
        if insurance.key_person_insurance:
            coverage_types.append("key_person")
            scores.append(78)

        if coverage_types:
            insights.append(EvidenceInsight(
                indicator="Insurance Policies",
                category="business_continuity",
                value=", ".join(coverage_types),
                benchmark="property + BI + liability",
                impact="positive",
                narrative=f"Active coverage: {', '.join(coverage_types)}.",
                confidence=ConfidenceLevel.HIGH,
                data_source="insurance_records",
            ))

        if insurance.coverage_adequacy_pct is not None:
            scores.append(_clamp(insurance.coverage_adequacy_pct, 0, 100))
            insights.append(EvidenceInsight(
                indicator="Coverage Adequacy",
                category="business_continuity",
                value=f"{insurance.coverage_adequacy_pct:.0f}%",
                benchmark="80%",
                impact="positive" if insurance.coverage_adequacy_pct >= 80 else "negative",
                narrative=f"Insurance covers {insurance.coverage_adequacy_pct:.0f}% of asset/revenue exposure.",
                confidence=ConfidenceLevel.MEDIUM,
                data_source="insurance_records",
            ))

        if insurance.claims_history_clean:
            scores.append(90)
            insights.append(EvidenceInsight(
                indicator="Claims History",
                category="business_continuity",
                value="clean",
                benchmark="clean",
                impact="positive",
                narrative="No adverse insurance claims history.",
                confidence=ConfidenceLevel.HIGH,
                data_source="insurance_records",
            ))

        score = sum(scores) / len(scores) if scores else 52
        return DimensionScore(
            dimension="insurance_business_continuity",
            score=round(score, 1),
            weight=weight,
            risk_level=_score_to_risk(score),
            confidence=ConfidenceLevel.HIGH if coverage_types else ConfidenceLevel.LOW,
            insights=insights,
        )

    def score_geographic_risk(self, geographic, profile, weight: float) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        state = geographic.state if geographic else None
        tier = geographic.tier if geographic else None

        if not state and profile.gstin:
            state = "maharashtra" if profile.gstin.startswith("27") else None

        base = geographic_risk_score(state, tier)
        scores = [base]

        if state:
            insights.append(EvidenceInsight(
                indicator="State Economic Index",
                category="geographic_risk",
                value=state.replace("_", " ").title(),
                benchmark="top quartile states",
                impact="positive" if base >= 75 else "neutral" if base >= 65 else "negative",
                narrative=f"Operating in {state.replace('_', ' ').title()} — economic risk index {base:.0f}/100.",
                confidence=ConfidenceLevel.HIGH,
                data_source="geographic_risk_index",
            ))

        if geographic and geographic.flood_risk_zone:
            flood_penalty = {"low": 0, "moderate": -8, "high": -18, "very_high": -30}
            adj = flood_penalty.get(geographic.flood_risk_zone.lower(), 0)
            base = _clamp(base + adj, 0, 100)
            scores = [base]
            insights.append(EvidenceInsight(
                indicator="Flood Risk Zone",
                category="geographic_risk",
                value=geographic.flood_risk_zone,
                benchmark="low",
                impact="negative" if adj < -10 else "neutral",
                narrative=f"Flood risk classified as {geographic.flood_risk_zone}.",
                confidence=ConfidenceLevel.MEDIUM,
                data_source="geographic_risk_index",
            ))

        if geographic and geographic.industrial_cluster_presence:
            scores.append(min(100, base + 5))
            insights.append(EvidenceInsight(
                indicator="Industrial Cluster",
                category="geographic_risk",
                value="present",
                benchmark="present",
                impact="positive",
                narrative="Located in established industrial cluster — infrastructure and supply chain advantages.",
                confidence=ConfidenceLevel.MEDIUM,
                data_source="geographic_risk_index",
            ))

        score = sum(scores) / len(scores) if scores else 65
        return DimensionScore(
            dimension="geographic_risk",
            score=round(score, 1),
            weight=weight,
            risk_level=_score_to_risk(score),
            confidence=ConfidenceLevel.HIGH if state else ConfidenceLevel.LOW,
            insights=insights,
        )

    def score_peer_benchmark(self, profile, accounting, credit_bureau, carbon_data, weight: float) -> DimensionScore:
        insights: list[EvidenceInsight] = []
        scores: list[float] = []
        bench = get_sector_benchmark(profile.sector)

        revenue_pct = estimate_percentile(accounting.revenue_inr, bench["median_revenue_inr"])
        scores.append(revenue_pct)
        insights.append(EvidenceInsight(
            indicator="Revenue Percentile",
            category="peer_benchmark",
            value=f"{revenue_pct:.0f}th percentile",
            benchmark="50th",
            impact="positive" if revenue_pct >= 50 else "negative",
            narrative=(
                f"Revenue ₹{accounting.revenue_inr:,.0f} vs sector median "
                f"₹{bench['median_revenue_inr']:,.0f} — {revenue_pct:.0f}th percentile."
            ),
            confidence=ConfidenceLevel.HIGH,
            data_source="sector_benchmarks",
        ))

        cr = accounting.current_assets_inr / accounting.current_liabilities_inr if accounting.current_liabilities_inr > 0 else 1.5
        cr_pct = estimate_percentile(cr, bench["median_current_ratio"])
        scores.append(cr_pct)
        insights.append(EvidenceInsight(
            indicator="Liquidity Percentile",
            category="peer_benchmark",
            value=f"{cr_pct:.0f}th percentile",
            benchmark="50th",
            impact="positive" if cr_pct >= 50 else "negative",
            narrative=f"Current ratio {cr:.2f} vs sector median {bench['median_current_ratio']:.2f}.",
            confidence=ConfidenceLevel.HIGH,
            data_source="sector_benchmarks",
        ))

        margin = (accounting.revenue_inr - accounting.cost_of_goods_inr - accounting.operating_expenses_inr) / accounting.revenue_inr if accounting.revenue_inr > 0 else 0
        margin_pct = estimate_percentile(margin * 100, bench["median_operating_margin_pct"])
        scores.append(margin_pct)
        insights.append(EvidenceInsight(
            indicator="Margin Percentile",
            category="peer_benchmark",
            value=f"{margin_pct:.0f}th percentile",
            benchmark="50th",
            impact="positive" if margin_pct >= 50 else "negative",
            narrative=f"Operating margin {margin:.1%} vs sector median {bench['median_operating_margin_pct']:.1f}%.",
            confidence=ConfidenceLevel.HIGH,
            data_source="sector_benchmarks",
        ))

        if credit_bureau and credit_bureau.debt_service_coverage_ratio:
            dscr_pct = estimate_percentile(credit_bureau.debt_service_coverage_ratio, bench["median_dscr"])
            scores.append(dscr_pct)
            insights.append(EvidenceInsight(
                indicator="DSCR Percentile",
                category="peer_benchmark",
                value=f"{dscr_pct:.0f}th percentile",
                benchmark="50th",
                impact="positive" if dscr_pct >= 50 else "negative",
                narrative=f"DSCR {credit_bureau.debt_service_coverage_ratio:.2f}x vs sector median {bench['median_dscr']:.2f}x.",
                confidence=ConfidenceLevel.HIGH,
                data_source="sector_benchmarks",
            ))

        avg_pct = sum(scores) / len(scores)
        insights.append(EvidenceInsight(
            indicator="Cohort Size",
            category="peer_benchmark",
            value=int(bench["cohort_size"]),
            benchmark=None,
            impact="neutral",
            narrative=f"Benchmarked against {int(bench['cohort_size']):,} MSMEs in {profile.sector} sector.",
            confidence=ConfidenceLevel.MEDIUM,
            data_source="sector_benchmarks",
        ))

        return DimensionScore(
            dimension="peer_benchmark",
            score=round(avg_pct, 1),
            weight=weight,
            risk_level=_score_to_risk(avg_pct),
            confidence=ConfidenceLevel.HIGH,
            insights=insights,
        )


advanced_scoring = AdvancedScoring()
