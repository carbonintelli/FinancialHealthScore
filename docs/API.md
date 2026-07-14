# API Reference

Base URL: `http://localhost:8080`  
Platform: **Node.js Express v2.1**

Display labels for statuses, risk ratings, and portal terminology: [TERMINOLOGY.md](./TERMINOLOGY.md).

API root metadata: `GET /api`  

## System

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api` | — | Service metadata, version, stakeholders |
| `GET` | `/api/v1/health` | — | Health check, agentic orchestration flags |
| `GET` | `/api/v1/integrations/status` | — | Bureau, tax, AA, UPI, EPFO, carbon, ecosystem, AI agent status |
| `GET` | `/api/v1/auth/demo-credentials` | — | Demo logins for all stakeholder portals |

## Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | — | Email/password → JWT bearer token |
| `POST` | `/api/v1/auth/register` | — | MSME enterprise registration + optional FHS on signup |
| `GET` | `/api/v1/auth/me` | JWT | Current user profile |

**Login example:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"credit@idbi.bank.in","password":"IDBI@2026"}'
```

## Assessment

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/assess` | — | Full MSME assessment with optional auto-enrich + thin-file mode |
| `GET` | `/api/v1/assess/demo` | — | Demo with sample MSME (`?audience=credit_team`) |
| `POST` | `/api/v1/bank/assess/{msme_id}` | Bank JWT | Assess portfolio MSME + agent orchestration |
| `POST` | `/api/v1/msme/assess/quick` | MSME JWT | Quick self-assessment + agent orchestration |
| `POST` | `/api/v1/msme/assess/alternate-data` | MSME JWT | NTC/NTB assessment with GST/UPI/AA/EPFO enrichment |
| `POST` | `/api/v1/ecosystem/ocen/credit-assessment` | — | OCEN-format Financial Health Card (public) |

### POST /api/v1/assess

**Request body** (see `examples/assessment_request.json`):

```json
{
  "financial_data": { ... },
  "include_carbon_intelligence": true,
  "audience": "credit_team",
  "auto_enrich": true,
  "thin_file_mode": true,
  "alternate_data": {
    "include_aa": true,
    "include_upi": true,
    "include_epfo": true,
    "aa_session_id": "aa-msme-demo-001-abc123"
  }
}
```

**Audience values:** `credit_team`, `risk_team`, `relationship_manager`, `portfolio_analyst`

**Response highlights** (demo MSME baseline):

```json
{
  "overall_score": 77.3,
  "grade": "B+",
  "overall_risk_level": "low",
  "dimension_scores": [ ... ],
  "risk_indicators": [ ... ],
  "data_gaps": [ ... ],
  "recommended_improvements": [ ... ],
  "advanced_intelligence": {
    "enrichment_applied": ["credit_bureau", "tax_verification", "upi_analytics", "epfo_compliance"],
    "peer_percentile_overall": 72.5
  },
  "metadata": {
    "borrower_segment": "NTC_NTB",
    "thin_file_scoring": true,
    "alternate_data_sources": ["gst", "upi", "account_aggregator", "epfo"]
  }
}
```

Stored assessments (bank/MSME quick assess) also return `agent_insights` with the full 27-agent orchestration output.

## Agentic AI

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/agents/architecture` | — | Orchestration phases, dimension agents, agent count |
| `GET` | `/api/v1/agents/status` | JWT | Agent run log (`?assessment_id=` optional) |
| `POST` | `/api/v1/agents/orchestrate/{assessment_id}` | JWT | Re-run full orchestration on stored assessment |
| `GET` | `/api/v1/agents/orchestration/{orchestration_id}` | JWT | Retrieve orchestration result |
| `GET` | `/api/v1/agents/dimension/{dimension_id}` | JWT | Single dimension agent (`?assessment_id=` required) |

See [AGENTIC_ARCHITECTURE.md](./AGENTIC_ARCHITECTURE.md).

## Lending Institution Portal

Bank-facing endpoints for portfolio credit intelligence and credit application workflow.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/bank/dashboard` | Bank JWT | Executive dashboard: portfolio stats, pending credit applications |
| `GET` | `/api/v1/bank/portfolio` | Bank JWT | MSME lending portfolio with latest FHS and credit grades |
| `GET` | `/api/v1/bank/assessments` | Bank JWT | Credit assessment history |
| `POST` | `/api/v1/bank/assess/{msme_id}` | Bank JWT | Initiate credit assessment + agent orchestration |
| `GET` | `/api/v1/bank/loans` | Bank JWT | Credit facility applications |
| `PATCH` | `/api/v1/bank/loans/{loan_id}` | Bank JWT | Update application status (sanction / decline / review) |

**Credit application status values:** `submitted`, `under_review`, `approved`, `rejected`, `disbursed`  
Display labels: see [TERMINOLOGY.md](./TERMINOLOGY.md#credit-application-status).

## Enterprise Portal (MSME)

Enterprise-facing endpoints for registration, financial data submission, credit assessment, and facility applications.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/msme/dashboard` | MSME JWT | Enterprise dashboard: latest FHS, credit grade, open applications |
| `GET` | `/api/v1/msme/profile` | MSME JWT | Enterprise profile & stored financial statements |
| `PUT` | `/api/v1/msme/profile` | MSME JWT | Update enterprise profile & financial data |
| `GET` | `/api/v1/msme/data-feeds` | MSME JWT | Financial data submission log |
| `POST` | `/api/v1/msme/data-feed` | MSME JWT | Submit financial data + optional FHS recalculation |
| `POST` | `/api/v1/msme/assess` | MSME JWT | Credit assessment from stored profile data |
| `POST` | `/api/v1/msme/assess/quick` | MSME JWT | Initiate credit assessment (uses profile if available) |
| `POST` | `/api/v1/msme/assess/alternate-data` | MSME JWT | NTC/NTB assessment with GST/UPI/AA/EPFO enrichment |
| `GET` | `/api/v1/msme/reassessment-events` | MSME JWT | Webhook-triggered reassessment event log |
| `POST` | `/api/v1/msme/assess/import` | MSME JWT | ERP import + credit assessment (Tally / Zoho) |
| `POST` | `/api/v1/msme/assess/import/preview` | MSME JWT | Preview ERP import without persisting assessment |
| `GET` | `/api/v1/msme/assessments` | MSME JWT | Credit assessment history |
| `GET` | `/api/v1/msme/loans` | MSME JWT | List own credit facility applications |
| `POST` | `/api/v1/msme/loans` | MSME JWT | Submit credit facility application |

## Government Portal

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/govt/dashboard` | Govt JWT | National MSME registry, scheme statistics |
| `GET` | `/api/v1/govt/schemes/catalog` | Govt JWT | Government schemes catalogue |
| `POST` | `/api/v1/govt/schemes/recommend/{msme_id}` | Govt JWT | AI policy & scheme advisory agent |
| `GET` | `/api/v1/govt/scheme-applications` | Govt JWT | Scheme application list |

## Regulatory Supervisory Portal

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/regulatory/dashboard` | Reg JWT | Elevated-risk assessments, regulatory submissions |
| `POST` | `/api/v1/regulatory/review/{msme_id}` | Reg JWT | AI regulatory compliance review |

## Reports

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/reports/{assessment_id}` | JWT | Detailed JSON credit assessment report |
| `GET` | `/api/v1/reports/{assessment_id}/html` | JWT | Printable HTML credit assessment report |

## Government Policy

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/policies/catalog?sector=auto_components` | — | Applicable Indian MSME schemes |

## External Integrations

| Method | Path | Auth | Parameters |
|---|---|---|---|
| `POST` | `/api/v1/integrations/bureau/pull` | — | `gstin`, `pan`, `business_name` |
| `POST` | `/api/v1/integrations/tax/verify` | — | `gstin`, `pan` |
| `GET` | `/api/v1/integrations/connectors` | — | List Tally, Zoho, Carbon Intelligence connectors |
| `POST` | `/api/v1/integrations/tally/import` | JWT | `company_name`, `tally_company_id`, `from_date`, `to_date` |
| `POST` | `/api/v1/integrations/zoho/import` | JWT | `organization_id`, `from_date`, `to_date` |
| `GET` | `/api/v1/integrations/carbon/catalog` | — | ci.sustainow.in integration catalog |
| `GET` | `/api/v1/integrations/carbon/{msme_id}` | JWT | Carbon footprint + transaction summary |
| `GET` | `/api/v1/integrations/carbon/{msme_id}/sustainability-report` | JWT | Composite sustainability score & report |
| `POST` | `/api/v1/msme/assess/import` | MSME JWT | `connector` (`tally` \| `zoho`), `include_carbon_intelligence` |
| `POST` | `/api/v1/msme/assess/import/preview` | MSME JWT | Preview import without persisting assessment |

See [DATA_CONNECTORS.md](./DATA_CONNECTORS.md) for connector setup and the import-to-score pipeline.

## Alternate Data & Ecosystem (OCEN / ULI / AA)

See [ECOSYSTEM.md](./ECOSYSTEM.md) for full workflow documentation.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/integrations/alternate-data/connectors` | — | List GST, UPI, AA, EPFO connectors |
| `POST` | `/api/v1/integrations/upi/analytics` | JWT | UPI merchant payment analytics |
| `POST` | `/api/v1/integrations/epfo/verify` | JWT | EPFO establishment compliance |
| `GET` | `/api/v1/ecosystem/catalog` | — | OCEN/ULI product catalog |
| `POST` | `/api/v1/ecosystem/aa/consent/initiate` | JWT | Start AA consent session |
| `POST` | `/api/v1/ecosystem/aa/consent/fetch` | JWT | Fetch consented AA bank data |
| `GET` | `/api/v1/ecosystem/aa/consent/sessions` | JWT | List AA consent sessions |
| `POST` | `/api/v1/ecosystem/ocen/credit-assessment` | — | OCEN-format Financial Health Card |
| `POST` | `/api/v1/ecosystem/uli/loan-eligibility` | — | ULI loan eligibility adapter |
| `POST` | `/api/v1/webhooks/alternate-data` | Webhook secret | Near-real-time reassessment trigger |

### POST /api/v1/ecosystem/ocen/credit-assessment

```json
{
  "borrower": {
    "msme_id": "msme-demo-001",
    "business_name": "Shree Ganesh Auto Components Pvt Ltd",
    "gstin": "27AABCS1234F1Z5"
  },
  "consent_refs": { "aa_session_id": "aa-msme-demo-001-abc123" },
  "assessment_options": {
    "thin_file_mode": true,
    "include_alternate_data": true
  }
}
```

### POST /api/v1/webhooks/alternate-data

```json
{
  "event_type": "upi.analytics.refresh",
  "msme_id": "msme-demo-001",
  "source": "upi"
}
```

Supported `event_type` values: `gst.filing.updated`, `aa.statement.received`, `upi.analytics.refresh`, `epfo.contribution.posted`.

Mock mode is the default (`USE_MOCK_INTEGRATIONS=true`). Set API keys in `.env` for live integrations.

## Input Data Blocks

| Block | Key Fields |
|---|---|
| `profile` | `business_name`, `gstin`, `pan`, `udyam_number`, `sector`, `state`, `borrower_segment` |
| `accounting` | `revenue_inr`, `current_assets_inr`, `total_debt_inr`, etc. |
| `account_aggregator` | `session_id`, `avg_monthly_balance_inr`, `cash_flow_volatility_pct`, `months_of_statements` |
| `upi_analytics` | `monthly_transaction_volume_inr`, `payment_success_rate_pct`, `revenue_growth_mom_pct` |
| `epfo_compliance` | `registered`, `employee_count_reported`, `contribution_compliance_pct` |
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
| `401` | Invalid or missing JWT (e.g. *Invalid credentials. Please verify your email and password.*) |
| `403` | Role or ownership access denied (e.g. *Read-only access: credit assessment is not permitted*) |
| `404` | Resource not found (e.g. *Credit assessment not found*, *Credit application not found*) |
| `422` | Registration validation failure |
| `500` | Server or scoring engine error |
| `503` | Integration unavailable (live mode without API key) |

User-facing error messages use formal banking terminology. See [TERMINOLOGY.md](./TERMINOLOGY.md#api-error-messages).

## Snapshots

Golden-file regression tests cover key endpoints. Regenerate after API changes:

```bash
cd server && npm run generate:snapshots && npm test
```

See [PRODUCT_SNAPSHOTS.md](./PRODUCT_SNAPSHOTS.md) for the full snapshot catalog.
