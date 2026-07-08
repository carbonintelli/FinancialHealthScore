# API Reference

Base URL: `http://localhost:8080`

Interactive docs: [/docs](http://localhost:8080/docs)

## System

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service metadata |
| `GET` | `/api/v1/health` | Health check, version, dimension count |
| `GET` | `/api/v1/integration` | Carbon Intelligence integration info |
| `GET` | `/api/v1/integrations/status` | All integration client status |

## Assessment

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/assess` | Full MSME assessment (JSON body) |
| `GET` | `/api/v1/assess/demo` | Demo with sample MSME data |
| `GET` | `/api/v1/msme/{id}/score` | Score from Carbon Intelligence ID only |

### POST /api/v1/assess

**Request body** (see `examples/assessment_request.json`):

```json
{
  "financial_data": { ... },
  "include_carbon_intelligence": true,
  "auto_enrich": true,
  "audience": "credit_team"
}
```

**Audience values:** `credit_team`, `risk_team`, `relationship_manager`, `portfolio_analyst`

**Response highlights:**

```json
{
  "overall_score": 78.1,
  "grade": "B+",
  "overall_risk_level": "low",
  "dimension_scores": [ ... ],
  "risk_indicators": [ ... ],
  "data_gaps": [ ... ],
  "recommended_improvements": [ ... ],
  "advanced_intelligence": {
    "enrichment_applied": ["credit_bureau", "tax_verification"],
    "peer_percentile_overall": 72.5
  }
}
```

## Carbon Intelligence

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/msme/{id}/carbon` | Fetch CI carbon data |
| `GET` | `/api/v1/carbon/catalog` | CI integration catalog |

## Government Policy

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/policies/catalog?sector=auto_components` | Applicable schemes |

## External Integrations

| Method | Path | Parameters |
|---|---|---|
| `POST` | `/api/v1/integrations/bureau/pull` | `gstin`, `pan`, `business_name` |
| `POST` | `/api/v1/integrations/tax/verify` | `gstin`, `pan` |
| `POST` | `/api/v1/integrations/legal/search` | `business_name`, `directors[]` |

## Input Data Blocks

| Block | Key Fields |
|---|---|
| `profile` | `business_name`, `gstin`, `pan`, `udyam_number`, `sector`, `state` |
| `accounting` | `revenue_inr`, `current_assets_inr`, `total_debt_inr`, etc. |
| `founder` | `cibil_score`, `years_industry_experience`, `is_female` |
| `credit_bureau` | `crisil_rating`, `past_debts[]`, `repayment_history[]` |
| `legal_compliance` | `company_lawsuits[]`, `founder_lawsuits[]` |
| `tax_compliance` | `itr_filed_on_time_3y`, `income_tax_paid_inr_12m` |
| `operational_certifications` | `certifications[]`, `quality_audit_passed` |
| `government_compliance` | `pf_esi_compliance_pct`, `statutory_audit_completed` |
| `governance_diversity` | `female_founders_count`, `female_directors_count` |
| `esg_disclosure` | `brsr_lite_ready`, `ghg_inventory_completed` |
| `supply_chain` | `stress_scenario_survival_months`, `alternate_suppliers_identified_pct` |
| `insurance` | `business_interruption_cover`, `coverage_adequacy_pct` |
| `geographic` | `state`, `tier`, `flood_risk_zone` |
| `documents` | `[{ "document_type": "itr", "file_name": "..." }]` |

## Error Codes

| Status | Meaning |
|---|---|
| `200` | Success |
| `422` | Validation error (invalid request body) |
| `502` | External integration failure |
