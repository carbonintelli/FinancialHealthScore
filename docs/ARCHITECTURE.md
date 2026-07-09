# Architecture

Financial Health Score (FHS) is a **Node.js Express** platform (v2.1) that ingests consented MSME financial, operational, and alternative data, enriches it via external integrations and AI agents, and produces an explainable **20-dimension Financial Health Score** for lending institutions, enterprises, government bodies, and regulators.

The **Node.js scoring engine** (`server/src/services/scoring/`) is the default runtime (`SCORING_ENGINE=node`). A legacy **Python** bridge (`server/scoring_bridge.py` → `app/services/scoring_engine.py`) remains available for comparison. A legacy **FastAPI** server (`python run.py`) is also available for Python-only deployments.

Developed for **IDBI Innovate 2026** by SUSTAINOW TECHNOLOGIES.

## System Context

```mermaid
flowchart TB
    subgraph Clients
        BANK[Lending Institution — Credit / Risk / RM]
        MSME[Enterprise Proprietors]
        GOVT[Government / SIDBI]
        REG[Regulatory Supervisors]
    end

    subgraph Node[Node.js Platform — port 8080]
        WEB[Express REST API]
        SCORE[Node Scoring Engine — 20 dimensions]
        AGENTS[Agentic Orchestrator — 27 agents]
        STORE[SQLite Assessment Store]
        FE[Static Frontend /app/]
    end

    subgraph Python[Python Scoring — optional fallback]
        SE[scoring_engine.py]
    end

    subgraph External
        CI[ci.sustainow.in Carbon Intelligence]
        BU[CIBIL / CRISIL Bureau]
        TX[GSTN / ITR Tax]
        AA[RBI Account Aggregator]
        UPI[UPI Merchant Analytics]
        EPFO[EPFO Establishment]
        LG[e-Courts / MCA Legal]
        OCEN[OCEN / ULI Ecosystem]
        OAI[OpenAI — optional]
    end

    BANK & MSME & GOVT & REG --> FE
    FE --> WEB
    WEB --> AGENTS
    WEB --> SE
    AGENTS --> OAI
    WEB --> BU & TX & AA & UPI & EPFO & LG & CI
    WEB --> OCEN
    WEB --> STORE
```

## Request Flow — Assessment

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant Score as Node Scoring Engine
    participant Orch as Agent Orchestrator
    participant CI as Carbon Intelligence
    participant DB as SQLite Store

    Client->>API: POST /api/v1/msme/assess/alternate-data (JWT)
    API->>API: enrichFinancialData (GST, AA, UPI, EPFO)
    API->>Score: assess() — thin-file weight adjustment if NTC/NTB
    Score-->>API: FinancialHealthScoreResult (20 dims + borrower_segment)
    API->>Orch: orchestrateAssessment (27 agents, 6 phases)
    Orch-->>API: agent_insights
    API->>DB: persist assessment + agent_insights
    API-->>Client: score + agent_insights JSON
```

## Request Flow — Webhook Reassessment

```mermaid
sequenceDiagram
    participant Source as Alternate Data Source
    participant WH as Webhook Handler
    participant ENR as Enrichment Pipeline
    participant Score as Scoring Engine
    participant DB as SQLite Store

    Source->>WH: POST /api/v1/webhooks/alternate-data
    WH->>ENR: enrichFinancialData (event-specific sources)
    ENR->>Score: assess() with thin-file mode
    Score-->>WH: updated FHS
    WH->>DB: persist assessment + webhook event
    WH-->>Source: assessment_id + score
```

## Component Map

| Layer | Module | Responsibility |
|---|---|---|
| **API** | `server/src/routes/api.ts` | REST endpoints, auth gates |
| **Auth** | `server/src/routes/auth.ts` | JWT login, demo credentials |
| **App** | `server/src/app.ts` | Express factory (tests + snapshots) |
| **Agents** | `server/src/services/agents/` | 27-agent orchestration pipeline |
| **Scoring** | `server/src/services/scoring/` | Node.js 20-dimension FHS engine (default) |
| **Scoring (legacy)** | `server/scoring_bridge.py` → `app/services/scoring_engine.py` | Python fallback (`SCORING_ENGINE=python`) |
| **Integrations** | `server/src/services/integrations/` | Bureau, tax, Tally, Zoho, carbon, AA, UPI, EPFO clients |
| **Enrichment** | `server/src/services/integrations/enrichment.ts` | Unified alternate-data enrichment pipeline |
| **Ecosystem** | `server/src/services/ecosystem/` | OCEN/ULI adapters, AA consent sessions |
| **Realtime** | `server/src/services/realtime/` | Webhook-triggered reassessment |
| **Thin-file** | `server/src/services/scoring/thin-file.ts` | NTC/NTB segmentation and weight adjustment |
| **MSME** | `server/src/services/msme-*.ts` | Enterprise registration, profile, data feeds |
| **Policies** | `server/src/data/government-policies.ts` | Scheme catalog by sector |
| **Store** | `server/src/services/store.ts` | Assessment persistence |
| **Reports** | `server/src/services/reports/` | JSON + HTML credit reports |
| **DB** | `server/src/db/` | SQLite schema + seed data |
| **Frontend** | `client/` | React TypeScript SPA (Vite) |
| **Frontend (legacy)** | `frontend/` | Static HTML fallback |
| **Legacy API** | `app/api/routes.py` | FastAPI endpoints (optional) |

## Agentic Orchestration

Every stored assessment (bank assess, MSME quick assess) triggers **27 AI agents** across **6 phases**:

1. **Enrichment** — bureau/tax/legal/document + AA/UPI/EPFO alternate data summary
2. **Dimension analysis** — 20 parallel dimension agents (one per scoring dimension)
3. **Risk synthesis** — composite risk profile
4. **Health score validation** — agent-validated score + governance bonus
5. **Report orchestration** — credit decision narrative
6. **Stakeholder agents** — credit, policy, regulatory outputs

See [AGENTIC_ARCHITECTURE.md](./AGENTIC_ARCHITECTURE.md) for full agent catalog and API.

## Scoring Architecture

The overall score is a **weighted composite** of 20 dimensions (weights sum to 1.0):

```
Overall Score = Σ (dimension_score × weight) + governance_bonus
```

```mermaid
flowchart LR
    subgraph Financial
        FR[Financial Resilience 9%]
        CF[Cash Flow 7%]
        PB[Payment Behaviour 7%]
        CH[Credit History 6%]
    end

    subgraph Operational
        OS[Operational Stability 6%]
        OC[Certifications 4%]
        SC[Supply Chain 4%]
    end

    subgraph People
        FC[Founder Capability 8%]
        GD[Governance Diversity 3%]
    end

    subgraph Market
        MS[Market Sentiment 5%]
        PD[Product Demand 4%]
        PB2[Peer Benchmark 3%]
    end

    subgraph Risk
        LC[Legal Compliance 6%]
        TC[Tax Compliance 4%]
        GR[Geographic Risk 3%]
        IC[Insurance 3%]
    end

    subgraph Sustainability
        CT[Carbon Transition 5%]
        ES[ESG Disclosure 4%]
        GP[Gov Policy 4%]
    end

    subgraph AltData
        AD[Alternative Data 5%]
    end

    Financial & Operational & People & Market & Risk & Sustainability & AltData --> SCORE[Overall Score 0-100]
```

## Integration Modes

| Integration | Mock Trigger | Live Trigger |
|---|---|---|
| Carbon Intelligence | No `CARBON_INTELLIGENCE_API_KEY` | `ci_live_*` key set |
| Credit Bureau | `USE_MOCK_INTEGRATIONS=true` (default) | `CREDIT_BUREAU_API_KEY` set |
| Tax Verification | `USE_MOCK_INTEGRATIONS=true` (default) | `TAX_API_KEY` set |
| Account Aggregator | `USE_MOCK_INTEGRATIONS=true` (default) | `ACCOUNT_AGGREGATOR_API_KEY` set |
| UPI Analytics | `USE_MOCK_INTEGRATIONS=true` (default) | `UPI_ANALYTICS_API_KEY` set |
| EPFO Compliance | `USE_MOCK_INTEGRATIONS=true` (default) | `EPFO_API_KEY` set |
| AI Agents | No `OPENAI_API_KEY` | `sk-*` key set (LLM narratives) |

See [ECOSYSTEM.md](./ECOSYSTEM.md) for OCEN/ULI adapters and webhook reassessment.

## Response Structure

Every assessment returns:

| Field | Description |
|---|---|
| `overall_score` | FHS — weighted 0–100 composite |
| `grade` | Credit grade (A+ to F) |
| `overall_risk_level` | Credit risk rating (`low` … `critical`) |
| `dimension_scores` | 20 scored dimensions with insights |
| `risk_indicators` | Actionable risk flags |
| `key_insights` | Top narrative insights |
| `data_gaps` | Missing inputs with severity |
| `recommended_improvements` | Actionable recommendations |
| `advanced_intelligence` | Integration status, peer percentile, alternate-data sources |
| `metadata.borrower_segment` | NTC/NTB segmentation and thin-file scoring flags |
| `agent_insights` | Full orchestration output (stored assessments) |

## Deployment

```bash
npm run install:all   # Node + client + Python deps
cp .env.example .env
npm run dev          # Development (port 8080)
npm run build && npm start   # Production
```

- **Platform login**: http://localhost:8080/app/index.html
- **API root**: `GET /api`
- **Health check**: `GET /api/v1/health`

Legacy Python server: `python run.py` (FastAPI with `/docs` OpenAPI UI).

## Testing Strategy

| Suite | Command | Coverage |
|---|---|---|
| Node platform + agents | `cd server && npm test` | 41 Vitest tests (platform + snapshots + scoring) |
| Python scoring unit | `pytest tests/test_scoring.py -v` | Dimension scorers, engine |
| Python advanced | `pytest tests/test_advanced.py -v` | ESG, peer, geo, supply chain |
| Python integrations | `pytest tests/test_integrations.py -v` | Bureau, tax, legal clients |
| Python API | `pytest tests/test_api_assess.py -v` | Legacy FastAPI assessment |

**Regenerate API snapshots** (Node.js golden files):

```bash
cd server && npm run generate:snapshots && npm test
```

Snapshot files live in `tests/snapshots/`. See [PRODUCT_SNAPSHOTS.md](./PRODUCT_SNAPSHOTS.md).
