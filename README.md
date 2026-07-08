# Financial Health Score

**AI-Powered Alternative Data Intelligence for MSME Credit Decisions**

Developed for **IDBI Innovate 2026** — **20-dimension** AI-powered alternative data intelligence for MSME credit decisions.

## Overview

Financial Health Score analyses consented MSME data—including transactions, utility bills, fuel invoices, accounting records, and business documents—and enriches it with [Sustainow Carbon Intelligence](https://ci.sustainow.in) to produce an explainable **Financial Health Score** with evidence-linked insights and confidence levels.

### Core Capabilities

**Financial & credit (6 dimensions)** — liquidity, leverage, profitability, cash flow, payment behaviour, credit history and debt servicing

**Operational & compliance (5 dimensions)** — operational stability, legal compliance, tax compliance, operational certifications, governance diversity (including women-led MSME credit benefit)

**Market & policy (4 dimensions)** — founder capability, market sentiment, product demand outlook, government policy alignment

**Sustainability & resilience (5 dimensions)** — carbon transition risk, ESG disclosure, supply chain resilience, insurance and business continuity, geographic risk

**Alternative intelligence (2 dimensions)** — alternative data signals, peer portfolio benchmarking

Each dimension produces a score (0–100), risk level, confidence, and evidence-linked insights. Assessments also return `data_gaps`, `recommended_improvements`, and `advanced_intelligence` summaries.

### Target Users

- **Credit Teams** — Complement traditional MSME credit assessment
- **Risk Teams** — Identify early financial and operational risk signals
- **Relationship Managers** — Discover green-finance opportunities
- **Portfolio Analysts** — Improve credit monitoring and portfolio intelligence

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env

# Run the server
python run.py
```

Server starts at **http://localhost:8080**

- **Platform Login**: http://localhost:8080/app/index.html
- **API Docs**: http://localhost:8080/docs
- **Demo Assessment**: http://localhost:8080/api/v1/assess/demo
- **Health Check**: http://localhost:8080/api/v1/health
- **Integrations Status**: http://localhost:8080/api/v1/integrations/status

### Demo Logins

| Portal | Email | Password |
|---|---|---|
| Bank Admin | `admin@idbi.bank.in` | `IDBI@2026` |
| Credit Team | `credit@idbi.bank.in` | `IDBI@2026` |
| MSME Owner | `rajesh@shreeganesh.in` | `MSME@2026` |

See [docs/PLATFORM.md](docs/PLATFORM.md) for full credentials, roles, and workflows.

## Documentation

| Document | Description |
|---|---|
| [docs/PLATFORM.md](docs/PLATFORM.md) | Login, bank & MSME portals, loan workflow, detailed reports |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System context, request flow, component map, testing strategy |
| [docs/API.md](docs/API.md) | REST endpoint reference |
| [docs/SCORING.md](docs/SCORING.md) | 20-dimension scoring model and grade bands |
| [docs/PRODUCT_SNAPSHOTS.md](docs/PRODUCT_SNAPSHOTS.md) | Golden-file API snapshots and demo MSME baseline |

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

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service info |
| `GET` | `/api/v1/auth/demo-credentials` | Demo bank & MSME logins |
| `POST` | `/api/v1/auth/login` | JWT authentication |
| `GET` | `/api/v1/bank/dashboard` | Bank portfolio stats (auth) |
| `POST` | `/api/v1/bank/assess/{msme_id}` | Assess portfolio MSME (auth) |
| `POST` | `/api/v1/msme/assess/quick` | MSME self-assessment (auth) |
| `GET` | `/api/v1/reports/{id}` | Detailed JSON credit report (auth) |
| `GET` | `/api/v1/reports/{id}/html` | Printable HTML report (auth) |
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/integration` | Carbon Intelligence integration details |
| `GET` | `/api/v1/integrations/status` | Bureau, tax, legal, OCR integration status |
| `POST` | `/api/v1/assess` | Full MSME assessment (`auto_enrich: true` by default) |
| `GET` | `/api/v1/assess/demo` | Demo with sample data |
| `POST` | `/api/v1/integrations/bureau/pull` | CIBIL/CRISIL bureau pull |
| `POST` | `/api/v1/integrations/tax/verify` | GSTN/ITR tax verification |
| `POST` | `/api/v1/integrations/legal/search` | e-Courts/MCA litigation search |
| `GET` | `/api/v1/msme/{id}/carbon` | Carbon Intelligence data |
| `GET` | `/api/v1/msme/{id}/score` | Score from CI data only |
| `GET` | `/api/v1/carbon/catalog` | CI integration catalog |
| `GET` | `/api/v1/policies/catalog` | Government policy catalog by sector |

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
├── frontend/                # Bank & MSME web portals
│   ├── index.html           # Login
│   ├── bank/                # Bank dashboard, portfolio, loans, reports
│   └── msme/                # MSME dashboard, assess, loans, reports
├── app/
│   ├── auth/                # JWT security & dependencies
│   ├── db/                  # SQLAlchemy models, seed data
│   ├── templates/           # HTML report templates
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings and environment
│   ├── api/routes.py        # REST API endpoints
│   ├── models/schemas.py    # Pydantic data models
│   ├── services/
│   │   ├── carbon_intelligence.py
│   │   ├── integrations.py       # Bureau, tax, legal, OCR clients
│   │   ├── enrichment.py         # Auto-enrichment pipeline
│   │   ├── advanced_scoring.py   # ESG, supply chain, geo, peer
│   │   └── scoring_engine.py
│   └── data/
│       ├── sector_benchmarks.py
│       ├── geographic_risk.py
│       └── sample_msme.py
├── docs/                    # Architecture, API, scoring, snapshots
├── scripts/
│   └── generate_snapshots.py
├── tests/
│   ├── snapshots/           # Golden-file API responses
│   ├── test_scoring.py
│   ├── test_advanced.py
│   ├── test_api_assess.py
│   ├── test_integrations.py
│   └── test_snapshots.py
├── examples/
├── requirements.txt
└── run.py
```

## Running Tests

```bash
# Full test suite (43 tests)
pytest -v

# Regenerate golden-file snapshots after API changes
python3 scripts/generate_snapshots.py
pytest tests/test_snapshots.py -v
```

## License

Developed by SUSTAINOW TECHNOLOGIES for IDBI Innovate 2026.
