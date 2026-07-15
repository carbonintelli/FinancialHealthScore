# Financial Health Score

**AI-Powered Alternative Data Intelligence for MSME Credit Decisions**

Developed for **IDBI Innovate 2026** — **20-dimension** AI-powered alternative data intelligence for MSME credit decisions, aligned with the **MSME Financial Health Card** framework (GST, UPI, AA, EPFO aggregation, OCEN/ULI ecosystem, NTC/NTB thin-file scoring).

## Overview

Financial Health Score analyses consented MSME data—including **GST returns, UPI merchant analytics, Account Aggregator bank statements, EPFO compliance**, transactions, utility bills, accounting records, and business documents—and enriches it with [Sustainow Carbon Intelligence](https://ci.sustainow.in) to produce an explainable **Financial Health Score** with evidence-linked insights and confidence levels.

**New-to-Credit (NTC)** and **New-to-Bank (NTB)** enterprises are supported via thin-file scoring that up-weights alternate data when traditional bureau history is absent.

### Core Capabilities

**Financial & credit (6 dimensions)** — liquidity, leverage, profitability, cash flow, payment behaviour, credit history and debt servicing

**Operational & compliance (5 dimensions)** — operational stability, legal compliance, tax compliance, operational certifications, governance diversity (including women-led MSME credit benefit)

**Market & policy (4 dimensions)** — founder capability, market sentiment, product demand outlook, government policy alignment

**Sustainability & resilience (5 dimensions)** — carbon transition risk, ESG disclosure, supply chain resilience, insurance and business continuity, geographic risk

**Alternative intelligence (2 dimensions)** — alternative data signals, peer portfolio benchmarking

Each dimension produces a score (0–100), risk level, confidence, and evidence-linked insights. Assessments also return `data_gaps`, `recommended_improvements`, and `advanced_intelligence` summaries.

### Target Users

- **Credit Analysts** — Complement traditional MSME credit underwriting
- **Risk Officers** — Identify early financial and operational risk signals
- **Relationship Managers** — Discover ESG-linked and green-finance opportunities
- **Portfolio Analysts** — Monitor lending book credit health and FHS trends
- **Enterprise Proprietors (MSME)** — Self-assessment, improvement guidance, credit facility applications
- **Government & SIDBI** — Scheme eligibility advisory and national MSME registry oversight
- **Regulatory Supervisors** — RBI, GSTN, MCA compliance review workflows

## Quick Start

**Live app:** [https://fhs.sustainow.in](https://fhs.sustainow.in) · UI: [https://fhs.sustainow.in/app/](https://fhs.sustainow.in/app/)

```bash
# Install server + React client dependencies
npm run install:all
cp .env.example .env

# Development — API (:8080) + Vite React SPA (:5173, proxies /api)
npm run dev

# Production build + start
npm run build && npm start
```

### Local development URLs

| | |
|---|---|
| API | http://localhost:8080 |
| React UI (Vite) | http://localhost:5173/app/ |
| React UI (built, via Express) | http://localhost:8080/app/ |

### Production URLs

| | |
|---|---|
| App | https://fhs.sustainow.in |
| Platform UI | https://fhs.sustainow.in/app/ |
| API root | https://fhs.sustainow.in/api |
| Demo assessment | https://fhs.sustainow.in/api/v1/assess/demo |
| Health | https://fhs.sustainow.in/api/v1/health |
| Agent architecture | https://fhs.sustainow.in/api/v1/agents/architecture |
| Integrations status | https://fhs.sustainow.in/api/v1/integrations/status |
| Ecosystem catalog | https://fhs.sustainow.in/api/v1/ecosystem/catalog |

### Demo Logins

| Portal | Email | Password |
|---|---|---|
| Lending Institution (Admin) | `admin@idbi.bank.in` | `IDBI@2026` |
| Credit Analyst | `credit@idbi.bank.in` | `IDBI@2026` |
| Enterprise Proprietor | `rajesh@shreeganesh.in` | `MSME@2026` |
| MSME Ministry | `admin@msme.gov.in` | `GOVT@2026` |
| RBI Supervisor | `supervisor@rbi.org.in` | `REG@2026` |

See [docs/NODE_PLATFORM.md](docs/NODE_PLATFORM.md) and [docs/PLATFORM.md](docs/PLATFORM.md) for full credentials and AI agent workflows.

## Documentation

| Document | Description |
|---|---|
| [docs/APPLICATION_UI_SNAPSHOTS.md](docs/APPLICATION_UI_SNAPSHOTS.md) | Visual UI screenshots of all stakeholder portals (Markdown) |
| [docs/APPLICATION_UI_SNAPSHOTS.html](docs/APPLICATION_UI_SNAPSHOTS.html) | Self-contained HTML gallery with embedded images |
| [docs/APPLICATION_SNAPSHOTS.md](docs/APPLICATION_SNAPSHOTS.md) | UI routes, portal pages & live application data snapshots |
| [docs/PRODUCT_SNAPSHOTS.md](docs/PRODUCT_SNAPSHOTS.md) | API golden-file regression snapshots |
| [docs/TERMINOLOGY.md](docs/TERMINOLOGY.md) | Banking & MSME terminology, portal labels, status mappings |
| [docs/AGENTIC_ARCHITECTURE.md](docs/AGENTIC_ARCHITECTURE.md) | Multi-phase agentic AI orchestration (27 agents, 6 phases) |
| [docs/NODE_PLATFORM.md](docs/NODE_PLATFORM.md) | Node.js server, AI agents, multi-stakeholder architecture |
| [docs/PLATFORM.md](docs/PLATFORM.md) | Sign-in, stakeholder portals, credit workflow, assessment reports |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System context, request flow, component map, testing strategy |
| [docs/API.md](docs/API.md) | REST endpoint reference |
| [docs/SCORING.md](docs/SCORING.md) | 20-dimension scoring model and grade bands |
| [docs/DATA_CONNECTORS.md](docs/DATA_CONNECTORS.md) | Tally, Zoho Books, GST/UPI/AA/EPFO & ci.sustainow.in import pipeline |
| [docs/ECOSYSTEM.md](docs/ECOSYSTEM.md) | OCEN/ULI adapters, AA consent, thin-file NTC/NTB scoring, webhooks |

## Carbon Intelligence Integration

The service integrates with the [Carbon Intelligence Partner API](https://ci.sustainow.in/api/v1/public/integration-catalog) at `ci.sustainow.in`.

### Configuration

Set your partner API key in `.env`:

```env
CARBON_INTELLIGENCE_API_KEY=ci_live_your_key_here
CARBON_INTELLIGENCE_BASE_URL=https://ci.sustainow.in/api
USE_MOCK_CARBON_DATA=false
```

Without an API key, the service runs in **demo mode** with realistic mock carbon data.

### CI Data Ingested

| Endpoint | Data Used |
|---|---|
| `/v1/partners/msmes/{id}/carbon-summary` | Emissions, carbon intensity, energy exposure |
| `/v1/partners/msmes/{id}/transactions/summary` | Cash flow, volatility, payment behaviour |
| `/v1/partners/msmes/{id}/reports/overview` | Reporting readiness, transition plan status |

## API Endpoints (Node.js v2.1)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api` | Service metadata |
| `GET` | `/api/v1/health` | Health check + agentic orchestration flags |
| `GET` | `/api/v1/auth/demo-credentials` | Demo logins (all stakeholders) |
| `POST` | `/api/v1/auth/login` | JWT authentication |
| `GET` | `/api/v1/agents/architecture` | 27-agent orchestration metadata |
| `POST` | `/api/v1/auth/register` | MSME enterprise registration + optional FHS on signup |
| `GET` | `/api/v1/bank/dashboard` | Lending portfolio stats (auth) |
| `POST` | `/api/v1/bank/assess/{msme_id}` | Initiate credit assessment for portfolio MSME (auth) |
| `POST` | `/api/v1/msme/assess/quick` | Enterprise credit assessment (auth) |
| `POST` | `/api/v1/msme/data-feed` | Submit financial data + optional FHS recalculation (auth) |
| `GET` | `/api/v1/govt/dashboard` | Government MSME registry (auth) |
| `POST` | `/api/v1/regulatory/review/{msme_id}` | Regulatory compliance review (auth) |
| `GET` | `/api/v1/reports/{id}` | Detailed JSON credit report (auth) |
| `GET` | `/api/v1/reports/{id}/html` | Printable HTML report (auth) |
| `POST` | `/api/v1/assess` | Full MSME assessment |
| `GET` | `/api/v1/assess/demo` | Demo with sample data |
| `GET` | `/api/v1/integrations/status` | Bureau, tax, legal, OCR, AI agent status |
| `POST` | `/api/v1/integrations/bureau/pull` | CIBIL/CRISIL bureau pull |
| `POST` | `/api/v1/integrations/tax/verify` | GSTN/ITR tax verification |
| `GET` | `/api/v1/policies/catalog` | Government policy catalog by sector |

Full reference: [docs/API.md](docs/API.md).

### Example: Full Assessment

```bash
curl -X POST http://localhost:8080/api/v1/assess \
  -H "Content-Type: application/json" \
  -d @examples/assessment_request.json
```

### Example: Demo Assessment

```bash
curl http://localhost:8080/api/v1/assess/demo?audience=credit_team
```

## Scoring Model (20 Dimensions)

| Dimension | Weight |
|---|---|
| Financial Resilience | 9% |
| Founder Capability | 8% |
| Cash Flow Health | 7% |
| Payment Behaviour | 7% |
| Credit History & Debt Servicing | 6% |
| Operational Stability | 6% |
| Legal Compliance | 6% |
| Carbon Transition Risk | 5% |
| Alternative Data Signals | 5% |
| Market Sentiment | 5% |
| Tax Compliance | 4% |
| Operational Certifications | 4% |
| Government Policy Alignment | 4% |
| Product Demand Outlook | 4% |
| ESG Disclosure | 4% |
| Supply Chain Resilience | 4% |
| Governance Diversity | 3% |
| Insurance & Business Continuity | 3% |
| Geographic Risk | 3% |
| Peer Benchmark | 3% |

## External Integrations (Implemented)

| Integration | Endpoint | Mode |
|---|---|---|
| CIBIL/CRISIL Bureau | `POST /api/v1/integrations/bureau/pull` | Mock + live API |
| GSTN/ITR Tax | `POST /api/v1/integrations/tax/verify` | Mock + live API |
| Account Aggregator (RBI AA) | `POST /api/v1/ecosystem/aa/consent/initiate` | Mock + live API |
| UPI Merchant Analytics | `POST /api/v1/integrations/upi/analytics` | Mock + live API |
| EPFO Establishment | `POST /api/v1/integrations/epfo/verify` | Mock + live API |
| OCEN Credit Assessment | `POST /api/v1/ecosystem/ocen/credit-assessment` | Protocol adapter |
| ULI Loan Eligibility | `POST /api/v1/ecosystem/uli/loan-eligibility` | Protocol adapter |
| Real-time Reassessment | `POST /api/v1/webhooks/alternate-data` | Webhook pipeline |
| e-Courts/MCA Legal | `POST /api/v1/integrations/legal/search` | Mock + live API |
| Document OCR | Auto via `documents[]` in assessment | Mock + live API |
| Carbon Intelligence | ci.sustainow.in | Mock + live API |
| Auto-enrichment | `auto_enrich: true` on assessment | Pulls bureau/tax/legal from GSTIN/PAN |

Set API keys in `.env` to switch from mock to live integrations.

## Advanced Analytics (Implemented)

- **Peer portfolio benchmarking** — percentile rank vs sector cohort
- **ESG/BRSR disclosure scoring** — beyond carbon intelligence
- **Supply chain stress testing** — 30% revenue shock survival months
- **Insurance & business continuity** — coverage adequacy assessment
- **Geographic risk indexing** — state economic index + flood zone
- **Document intelligence** — ITR, audit, bank statement OCR validation

### Governance Diversity Credit Benefit

Women-led MSMEs receive a **governance score bonus** (up to +2.5 points on overall score).

## Project Structure

```
├── client/                  # React + TypeScript SPA (Vite)
│   ├── src/
│   │   ├── api/             # API client & auth
│   │   ├── components/      # Layout, ScoreHero, StatCard, …
│   │   ├── lib/             # terminology, portals, formatters
│   │   ├── pages/           # bank, msme, govt, regulatory routes
│   │   └── styles/          # Global styles (ported from legacy CSS)
│   └── vite.config.ts
├── server/                  # Node.js API (primary runtime)
│   ├── src/
│   │   ├── index.ts         # Express entry
│   │   ├── app.ts           # App factory (tests + snapshots)
│   │   ├── routes/          # Auth + API routes
│   │   ├── services/scoring/ # Node.js 20-dimension scoring engine
│   │   ├── services/agents/ # 27-agent orchestration
│   │   ├── services/ecosystem/ # OCEN/ULI adapters, AA consent
│   │   ├── services/realtime/  # Webhook reassessment pipeline
│   │   ├── db/              # SQLite + seed data
│   │   └── data/            # Government policy catalog
│   ├── scripts/
│   │   └── generate-snapshots.ts
│   └── tests/               # Vitest (platform + snapshots + scoring)
├── frontend/                # Legacy static HTML (fallback only)
├── docs/                    # Architecture, API, scoring, snapshots
├── tests/
│   └── snapshots/           # Golden-file API responses
└── examples/
```

## Running Tests

```bash
# Node.js platform + scoring + snapshot regression
cd server && npm test

# Regenerate golden-file snapshots after API changes
cd server && npm run generate:snapshots && npm test
```

## License

Developed by SUSTAINOW TECHNOLOGIES for IDBI Innovate 2026.
