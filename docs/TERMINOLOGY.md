# Terminology Guide

Professional banking and MSME industry terminology used across the Financial Health Score (FHS) platform — UI, API error messages, and documentation.

The canonical label registry lives in `frontend/js/terminology.js`. Server API field names (e.g. `status: "under_review"`) remain unchanged; only display labels are formalised.

## Platform & Portals

| Internal key | Display label | URL |
|---|---|---|
| `bank` | Lending Institution Portal | `/app/bank/` |
| `msme` | Enterprise Portal | `/app/msme/` |
| `govt` | MSME Policy Intelligence | `/app/govt/` |
| `regulatory` | Regulatory Supervisory Portal | `/app/regulatory/` |

### Portal subtitles

| Portal | Subtitle |
|---|---|
| Lending Institution | MSME Credit & Risk Management |
| Enterprise | Financial Health & Credit Access |
| Government | Ministry of MSME · Scheme Analytics |
| Regulatory | RBI · GSTN · MCA Oversight |

## Core Concepts

| Term | Definition |
|---|---|
| **Financial Health Score (FHS)** | 0–100 composite creditworthiness index across 20 weighted dimensions |
| **Credit Grade** | Letter grade (A+ through F) derived from FHS |
| **Credit Risk Rating** | Qualitative risk band: Low → Critical Credit Risk |
| **Credit Assessment** | Full 20-dimension FHS evaluation with AI orchestration |
| **Credit Assessment Report** | Detailed JSON/HTML report for a stored assessment |
| **Credit Application** | MSME request for a credit facility (working capital, term loan, etc.) |
| **Financial Data Submission** | Enterprise submission of accounting/financial statements |
| **ERP Data Integration** | Import of financial data from Tally ERP or Zoho Books |

## Navigation Labels (Enterprise Portal)

| Route | Label |
|---|---|
| `/app/msme/dashboard.html` | Enterprise Dashboard |
| `/app/msme/profile.html` | Financial Data Submission |
| `/app/msme/import.html` | ERP Data Integration |
| `/app/msme/assess.html` | Credit Assessment |
| `/app/msme/report.html` | Credit Assessment Report |
| `/app/msme/loans.html` | Credit Applications |
| `/app/msme/register.html` | MSME Enterprise Registration |

## Navigation Labels (Lending Institution Portal)

| Route | Label |
|---|---|
| `/app/bank/dashboard.html` | Executive Dashboard |
| `/app/bank/portfolio.html` | MSME Lending Portfolio |
| `/app/bank/loans.html` | Credit Applications |
| `/app/bank/report.html` | MSME Credit Assessment Report |

## Credit Application Status

API field `status` values and their display labels:

| API value | Display label |
|---|---|
| `draft` | Draft Application |
| `submitted` | Application Submitted |
| `under_review` | Under Credit Review |
| `approved` | Sanctioned |
| `rejected` | Declined |
| `disbursed` | Disbursed |

Bank credit officers use **Sanction** / **Decline** actions in the UI; these map to `approved` / `rejected` via `PATCH /api/v1/bank/loans/{loan_id}`.

## Credit Risk Ratings

API field `overall_risk_level` values and display labels:

| API value | Display label |
|---|---|
| `low` | Low Credit Risk |
| `moderate` | Moderate Credit Risk |
| `elevated` | Elevated Credit Risk |
| `high` | High Credit Risk |
| `critical` | Critical Credit Risk |

## Credit Facility Types

| API value | Display label |
|---|---|
| `working_capital` | Working Capital Facility |
| `term_loan` | Term Loan |
| `equipment_finance` | Equipment Finance |
| `green_finance` | Green / ESG-Linked Finance |

## Financial Data Sources

| API value | Display label |
|---|---|
| `manual` | Manual Financial Entry |
| `tally` | Tally ERP Integration |
| `zoho` | Zoho Books Integration |
| `bank_statement` | Bank Statement Upload |

## User Roles

| API role | Display label |
|---|---|
| `bank_admin` | Bank Administrator |
| `credit_team` | Credit Analyst |
| `risk_team` | Risk Officer |
| `relationship_manager` | Relationship Manager |
| `msme_owner` | Enterprise Proprietor |
| `msme_viewer` | Enterprise Viewer (Read-Only) |
| `govt_admin` | Ministry Administrator |
| `scheme_officer` | Scheme Officer |
| `sidbi_officer` | SIDBI Credit Officer |
| `rbi_supervisor` | RBI Supervisory Officer |
| `gstn_officer` | GSTN Compliance Officer |
| `mca_officer` | MCA Filing Officer |
| `nbfc_reviewer` | NBFC Credit Reviewer |

## Scoring Dimensions

Display names for the 20 FHS dimensions (API field `dimension` unchanged):

| API field | Display label |
|---|---|
| `financial_resilience` | Financial Resilience |
| `founder_capability` | Promoter Capability |
| `cash_flow_health` | Cash Flow Adequacy |
| `payment_behaviour` | Payment Discipline |
| `credit_history_debt_servicing` | Credit History & Debt Servicing |
| `operational_stability` | Operational Stability |
| `legal_compliance` | Legal & Statutory Compliance |
| `carbon_transition_risk` | Carbon Transition Risk |
| `alternative_data_signals` | Alternative Credit Signals |
| `market_sentiment` | Market Sentiment |
| `tax_compliance` | Tax Compliance |
| `operational_certifications` | Operational Certifications |
| `government_policy_alignment` | Government Policy Alignment |
| `product_demand_outlook` | Product Demand Outlook |
| `esg_disclosure` | ESG Disclosure |
| `supply_chain_resilience` | Supply Chain Resilience |
| `governance_diversity` | Corporate Governance |
| `insurance_business_continuity` | Insurance & Business Continuity |
| `geographic_risk` | Geographic Concentration Risk |
| `peer_benchmark` | Peer Benchmarking |

## Statutory Identifiers (MSME)

| Field | Label |
|---|---|
| `udyam_number` | Udyam Registration Number |
| `gstin` | GSTIN |
| `pan` | Permanent Account Number (PAN) |
| `msme_id` | MSME Registration ID (platform-assigned) |

## API Error Messages

User-facing errors use formal language. Examples:

| Scenario | Message |
|---|---|
| Invalid login | Invalid credentials. Please verify your email and password. |
| Inactive account | Account has been deactivated. Contact your administrator. |
| Duplicate registration | This email address is already registered |
| MSME viewer restriction | Read-only access: credit assessment is not permitted |
| Missing profile link | MSME enterprise profile is not linked to this account |
| Assessment not found | Credit assessment not found |
| Loan not found | Credit application not found |

## Frontend Integration

Include `terminology.js` before `api.js` on all portal pages:

```html
<script src="/app/js/terminology.js"></script>
<script src="/app/js/api.js"></script>
<script src="/app/js/ui.js"></script>
```

Formatter helpers in `api.js`:

- `formatLoanStatus(status)` — credit application status label
- `formatRiskLevel(level)` — credit risk rating label
- `formatLoanType(type)` — facility type label
- `formatDataSource(source)` — financial data source label
- `formatFeedStatus(status)` — data submission status label
- `riskBadge(level)` — HTML badge with full risk label
