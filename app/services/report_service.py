"""Generate detailed assessment reports (JSON + HTML)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.db.models import utc_now
from app.models.schemas import FinancialHealthScoreResult

TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)), autoescape=select_autoescape(["html"]))


def _credit_recommendation(score: float, grade: str, risk: str) -> str:
    if score >= 80 and risk in {"low", "moderate"}:
        return (
            f"RECOMMEND APPROVAL — Grade {grade} with score {score:.1f}/100 indicates strong financial health. "
            "Standard MSME lending terms with optional green-finance pricing if transition plan is submitted."
        )
    if score >= 65:
        return (
            f"CONDITIONAL APPROVAL — Grade {grade} (score {score:.1f}/100). "
            "Recommend secured facility or CGTMSE guarantee with covenants on cash flow monitoring "
            "and resolution of flagged risk indicators within 90 days."
        )
    if score >= 50:
        return (
            f"ENHANCED DUE DILIGENCE — Grade {grade} (score {score:.1f}/100). "
            "Elevated risk profile requires additional collateral, shorter tenure, or working-capital "
            "limits pending improvement in weakest dimensions."
        )
    return (
        f"DECLINE / DEFER — Grade {grade} (score {score:.1f}/100) below acceptable threshold. "
        "Recommend MSME capability building, data gap remediation, and re-assessment after 6 months."
    )


def build_detailed_report(result: FinancialHealthScoreResult, base_url: str = "") -> dict[str, Any]:
    dims = [d.model_dump(mode="json") for d in result.dimension_scores]
    sorted_dims = sorted(dims, key=lambda x: x["score"], reverse=True)
    weakest = sorted_dims[-3:] if len(sorted_dims) >= 3 else sorted_dims
    strongest = sorted_dims[:3]

    executive = (
        f"{result.business_name} received a Financial Health Score of {result.overall_score:.1f}/100 "
        f"(Grade {result.grade}, {result.overall_risk_level.value if hasattr(result.overall_risk_level, 'value') else result.overall_risk_level} risk). "
        f"Assessment confidence is {result.overall_confidence.value if hasattr(result.overall_confidence, 'value') else result.overall_confidence}. "
        f"Strongest areas: {', '.join(d['dimension'].replace('_', ' ').title() for d in strongest)}. "
        f"Areas requiring attention: {', '.join(d['dimension'].replace('_', ' ').title() for d in weakest)}. "
        f"{len(result.risk_indicators)} risk indicator(s) flagged. "
        f"{len(result.data_gaps)} data gap(s) identified."
    )

    risk_level = result.overall_risk_level.value if hasattr(result.overall_risk_level, "value") else str(result.overall_risk_level)

    return {
        "assessment_id": result.assessment_id,
        "business_name": result.business_name,
        "msme_id": result.msme_id,
        "generated_at": result.generated_at,
        "report_title": f"Financial Health Score — Detailed Credit Assessment Report",
        "executive_summary": executive,
        "overall_score": result.overall_score,
        "grade": result.grade,
        "overall_risk_level": risk_level,
        "overall_confidence": result.overall_confidence.value
        if hasattr(result.overall_confidence, "value")
        else str(result.overall_confidence),
        "dimension_scores": dims,
        "risk_indicators": [r.model_dump(mode="json") for r in result.risk_indicators],
        "key_insights": result.key_insights,
        "data_gaps": [g.model_dump(mode="json") for g in result.data_gaps],
        "recommended_improvements": result.recommended_improvements,
        "green_finance_opportunities": result.green_finance_opportunities,
        "government_policy_assessment": (
            result.government_policy_assessment.model_dump(mode="json")
            if result.government_policy_assessment
            else None
        ),
        "advanced_intelligence": (
            result.advanced_intelligence.model_dump(mode="json") if result.advanced_intelligence else None
        ),
        "carbon_intelligence": (
            result.carbon_intelligence.model_dump(mode="json") if result.carbon_intelligence else None
        ),
        "audience_summary": result.audience_summary,
        "credit_decision_recommendation": _credit_recommendation(result.overall_score, result.grade, risk_level),
        "metadata": result.metadata,
        "html_report_url": f"{base_url.rstrip('/')}/api/v1/reports/{result.assessment_id}/html",
    }


def render_html_report(result: FinancialHealthScoreResult) -> str:
    report = build_detailed_report(result)
    template = env.get_template("detailed_report.html")
    return template.render(
        report=report,
        result=result,
        generated_display=utc_now().strftime("%d %B %Y, %H:%M UTC"),
        dimension_scores=result.dimension_scores,
        risk_indicators=result.risk_indicators,
        data_gaps=result.data_gaps,
    )
