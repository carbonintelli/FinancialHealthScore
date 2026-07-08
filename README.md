# Financial Health Score

**AI-Powered Alternative Data Intelligence for MSME Credit Decisions**

Developed for **IDBI Innovate 2026** — transforming fragmented MSME financial and operational data into explainable, actionable intelligence for smarter credit decisions.

## Overview

Financial Health Score analyses consented MSME data—including transactions, utility bills, fuel invoices, accounting records, and business documents—and enriches it with [Sustainow Carbon Intelligence](https://ci.sustainow.in) to produce an explainable **Financial Health Score** with evidence-linked insights and confidence levels.

### Core Capabilities

| Capability | Description |
|---|---|
| **Financial Resilience** | Liquidity ratios, leverage, profitability margins |
| **Cash Flow Health** | Inflow/outflow patterns, volatility, net margins |
| **Operational Stability** | Cost efficiency, energy exposure, business tenure |
| **Payment Behaviour** | On-time rates, late payments, defaults |
| **Carbon Transition Risk** | Carbon intensity, energy cost exposure via CI |
| **Alternative Data Signals** | Supplier/customer concentration, bank balances |

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

- **API Docs**: http://localhost:8080/docs
- **Demo Assessment**: http://localhost:8080/api/v1/assess/demo
- **Health Check**: http://localhost:8080/api/v1/health

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
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/integration` | Integration details |
| `POST` | `/api/v1/assess` | Full MSME assessment |
| `GET` | `/api/v1/assess/demo` | Demo with sample data |
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

## Scoring Model

The overall Financial Health Score (0–100) is a weighted composite of **15 dimensions**:

| Dimension | Weight | Data Sources |
|---|---|---|
| Financial Resilience | 12% | Liquidity, leverage, margins |
| Cash Flow Health | 8% | Cash flows + CI transaction analytics |
| Operational Stability | 7% | Opex, utility bills, tenure |
| Payment Behaviour | 8% | Payment records + CI data |
| Carbon Transition Risk | 6% | ci.sustainow.in carbon intelligence |
| Alternative Data Signals | 6% | Concentration, bank balances |
| Founder Capability | 9% | Experience, CIBIL, management depth |
| Market Sentiment | 6% | NPS, reviews, media, retention |
| Product Demand Outlook | 5% | Products, order book, sector growth |
| Government Policy Alignment | 5% | Schemes + statutory compliance |
| Credit History & Debt Servicing | 8% | CRISIL, past debts, EMI, DSCR |
| **Legal Compliance** | 7% | Company/founder lawsuits, criminal cases |
| **Tax Compliance** | 5% | ITR, income tax paid, advance tax, TDS |
| **Operational Certifications** | 5% | ISO, IATF, BIS, ZED, quality audits |
| **Governance Diversity** | 3% | Female founders/directors, women-led enterprise |

### Governance Diversity Credit Benefit

Women-led MSMEs receive a **governance score bonus** (up to +2.5 points on overall score) based on RBI-observed lower NPA correlation. Female founders/directors improve the governance dimension and unlock Stand-Up India / MUDRA Mahila eligibility insights.

### Recommended Improvements

Every assessment returns `recommended_improvements` — actionable steps to close data gaps and improve weak dimensions.

### Suggested Future Enhancements

| Enhancement | Benefit |
|---|---|
| Live CIBIL/CRISIL bureau API | Automated credit rating pull |
| GSTN / Income Tax API | Real-time tax compliance verification |
| e-Courts / MCA integration | Automated litigation search |
| Document intelligence (ITR, audit) | OCR validation of financials |
| Peer portfolio benchmarking | Percentile rank vs sector cohort |
| ESG disclosure scoring | BRSR-lite readiness beyond carbon |
| Supply chain stress testing | Shock scenario for key customers |

### New Assessment Parameters

**Founder Risk & Capability** — Industry experience, entrepreneurship tenure, CIBIL score, prior defaults, management team depth, succession planning, certifications.

**Market Sentiment** — Customer NPS, Google ratings, media sentiment, customer retention, supplier trust, litigation history, GST compliance.

**Product & Market Demand** — Product portfolio mix, market demand outlook, sector growth rate, capacity utilisation, order book depth, export share, EV/import-substitution exposure.

**Government Policy Alignment** — Enrollment in schemes (Udyam, CGTMSE, PLI, CLCSS, ZED, SAMADHAN, etc.), eligibility for unenrolled schemes, sector policy tailwinds, and financing opportunities.

Each dimension produces:
- Score (0–100) with letter grade (A+ to F)
- Risk level (low → critical)
- Confidence level (high/medium/low)
- Evidence-linked insights with data source attribution

## Project Structure

```
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Settings and environment
│   ├── api/routes.py        # REST API endpoints
│   ├── models/schemas.py    # Pydantic data models
│   ├── services/
│   │   ├── carbon_intelligence.py  # ci.sustainow.in client
│   │   └── scoring_engine.py       # Score computation
│   └── data/sample_msme.py  # Demo MSME data
├── tests/
├── examples/
├── requirements.txt
└── run.py
```

## Running Tests

```bash
pytest -v
```

## License

Developed by SUSTAINOW TECHNOLOGIES for IDBI Innovate 2026.
