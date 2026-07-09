# Data Connectors & Alternate Data

Import MSME financial data from **Tally ERP** or **Zoho Books**, aggregate **alternate data** (GST, UPI, Account Aggregator, EPFO), enrich with **Sustainow Carbon Intelligence** (ci.sustainow.in), and compute the 20-dimension **Financial Health Score (FHS)**.

For OCEN/ULI ecosystem integration and thin-file NTC/NTB scoring, see [ECOSYSTEM.md](./ECOSYSTEM.md).

## Architecture

```mermaid
flowchart LR
    subgraph Sources
        T[Tally ERP]
        Z[Zoho Books]
        CI[ci.sustainow.in]
        GST[GSTN / ITR]
        AA[Account Aggregator]
        UPI[UPI Analytics]
        EPFO[EPFO]
    end

    subgraph Node Platform
        IMP[Data Import Service]
        ENR[Unified Enrichment]
        SUS[Sustainability Report]
        SCORE[Node Scoring Engine]
        TF[Thin-File Mode]
        AG[27-Agent Orchestration]
    end

    T --> IMP
    Z --> IMP
    CI --> IMP
    GST & AA & UPI & EPFO --> ENR
    IMP --> ENR
    ENR --> SUS
    ENR --> SCORE
    SCORE --> TF
    TF --> AG
```

## Connectors

| Connector | Demo mode | Live configuration |
|---|---|---|
| **Tally ERP** | Always available | `TALLY_API_URL` + `TALLY_API_KEY` |
| **Zoho Books** | Always available | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ORGANIZATION_ID` |
| **Carbon Intelligence** | When no API key | `CARBON_INTELLIGENCE_API_KEY` |
| **GSTN / ITR** | `USE_MOCK_INTEGRATIONS=true` | `TAX_API_KEY` |
| **Account Aggregator** | `USE_MOCK_INTEGRATIONS=true` | `ACCOUNT_AGGREGATOR_API_KEY` |
| **UPI Analytics** | `USE_MOCK_INTEGRATIONS=true` | `UPI_ANALYTICS_API_KEY` |
| **EPFO** | `USE_MOCK_INTEGRATIONS=true` | `EPFO_API_KEY` |

List ERP connectors: `GET /api/v1/integrations/connectors`  
List alternate-data connectors: `GET /api/v1/integrations/alternate-data/connectors`

## Carbon Intelligence (ci.sustainow.in)

Partner API endpoints used:

| Endpoint | Purpose |
|---|---|
| `GET /v1/public/integration-catalog` | API catalog & auth docs |
| `GET /v1/partners/msmes/:id/carbon-summary` | Carbon footprint (Scope 1/2/3, intensity) |
| `GET /v1/partners/msmes/:id/transactions/summary` | Cash flow, payment behaviour, concentration |
| `GET /v1/partners/msmes/:id/reports/overview` | ESG reporting readiness, GHG alignment |

### Sustainability report

`GET /api/v1/integrations/carbon/{msme_id}/sustainability-report`

Composite **sustainability score** (0–100) derived from:
- Carbon transition risk (from intensity)
- Data completeness
- Reporting readiness (BRSR / GHG)
- Transition plan status
- Payment behaviour from transaction analytics

This feeds the scoring engine's **carbon_transition_risk** and **esg_disclosure** dimensions.

## API — Import & Assess

### Preview (no score)

```bash
POST /api/v1/msme/assess/import/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "connector": "tally",
  "include_carbon_intelligence": true,
  "options": { "to_date": "2026-03-31" }
}
```

### Full pipeline

```bash
POST /api/v1/msme/assess/import
```

1. Pull accounting data from Tally ERP or Zoho Books
2. Fetch ci.sustainow.in carbon + transaction + reporting data
3. Build sustainability report
4. Merge into assessment request
5. Run Node.js 20-dimension FHS scoring engine
6. Run 27-agent orchestration
7. Persist credit assessment + return FHS

### Standalone imports

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/integrations/tally/import` | Tally financial data only |
| `POST` | `/api/v1/integrations/zoho/import` | Zoho Books financial data only |
| `GET` | `/api/v1/integrations/carbon/{msme_id}` | Full CI intelligence bundle |
| `GET` | `/api/v1/integrations/carbon/catalog` | CI partner API catalog |

## Enterprise Portal — ERP Data Integration

**ERP Data Integration** page: `/app/msme/import` (React route)

1. Select Tally ERP or Zoho Books connector
2. Preview imported P&L, cash flows, and sustainability metrics
3. Initiate full Financial Health Score credit assessment

## Alternate Data Assessment (NTC/NTB)

**Credit Assessment** page: `/app/msme/assess`

1. **Initiate Credit Assessment** — standard FHS with Carbon Intelligence
2. **NTC/NTB Alternate-Data Assessment** — aggregates GST, UPI, AA, EPFO with thin-file scoring

API equivalent: `POST /api/v1/msme/assess/alternate-data`

## Scoring Engine

Imported data is passed to the **Node.js scoring engine** (`server/src/services/scoring/`) together with Carbon Intelligence payloads — the same path as manual assessments and financial data submissions.

Set `SCORING_ENGINE=python` to use the legacy Python bridge instead. See [NODE_PLATFORM.md](./NODE_PLATFORM.md).

## Environment

```env
CARBON_INTELLIGENCE_API_KEY=ci_live_...
TALLY_API_URL=https://your-tally-gateway.example.com
TALLY_API_KEY=...
ZOHO_CLIENT_ID=...
ZOHO_REFRESH_TOKEN=...
ZOHO_ORGANIZATION_ID=...

# Alternate data (GST via TAX_API_KEY)
ACCOUNT_AGGREGATOR_API_KEY=
UPI_ANALYTICS_API_KEY=
EPFO_API_KEY=
TAX_API_KEY=
WEBHOOK_SECRET=
USE_MOCK_INTEGRATIONS=true
```

Without keys, all connectors run in **demo mode** with realistic sample data for Shree Ganesh Auto Components.
