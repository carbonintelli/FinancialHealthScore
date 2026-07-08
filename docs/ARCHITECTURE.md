# Architecture

Financial Health Score is a **Node.js Express** platform (v2.1) that ingests consented MSME financial, operational, and alternative data, enriches it via external integrations and AI agents, and produces an explainable **20-dimension Financial Health Score** for banks, MSMEs, government bodies, and regulators.

The scoring engine runs in **Python** (`app/services/scoring_engine.py`) and is invoked by the Node server via `server/scoring_bridge.py` for dimension parity. A legacy **FastAPI** server (`python run.py`) remains available for Python-only deployments.

Developed for **IDBI Innovate 2026** by SUSTAINOW TECHNOLOGIES.

## System Context

```mermaid
flowchart TB
    subgraph Clients
        BANK[Bank Credit / Risk / RM]
        MSME[MSME Owners]
        GOVT[Government / SIDBI]
        REG[Regulatory Bodies]
    end

    subgraph Node[Node.js Platform — port 8080]
        WEB[Express REST API]
        AGENTS[Agentic Orchestrator — 27 agents]
        STORE[SQLite Assessment Store]
        FE[Static Frontend /app/]
    end

    subgraph Python[Python Scoring Bridge]
        SE[Scoring Engine — 20 dimensions]
    end

    subgraph External
        CI[ci.sustainow.in Carbon Intelligence]
        BU[CIBIL / CRISIL Bureau]
        TX[GSTN / ITR Tax]
        LG[e-Courts / MCA Legal]
        OAI[OpenAI — optional]
    end

    BANK & MSME & GOVT & REG --> FE
    FE --> WEB
    WEB --> AGENTS
    WEB --> SE
    AGENTS --> OAI
    WEB --> BU & TX & LG & CI
    WEB --> STORE
```

## Request Flow — Assessment

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant Bridge as Python Scoring Bridge
    participant Orch as Agent Orchestrator
    participant CI as Carbon Intelligence
    participant DB as SQLite Store

    Client->>API: POST /api/v1/msme/assess/quick (JWT)
    API->>Bridge: assess_demo / assess_request
    Bridge-->>API: FinancialHealthScoreResult (20 dims)
    API->>Orch: orchestrateAssessment (27 agents, 6 phases)
    Orch-->>API: agent_insights
    API->>DB: persist assessment + agent_insights
    API-->>Client: score + agent_insights JSON
```

## Component Map

| Layer | Module | Responsibility |
|---|---|---|
| **API** | `server/src/routes/api.ts` | REST endpoints, auth gates |
| **Auth** | `server/src/routes/auth.ts` | JWT login, demo credentials |
| **App** | `server/src/app.ts` | Express factory (tests + snapshots) |
| **Agents** | `server/src/services/agents/` | 27-agent orchestration pipeline |
| **Scoring** | `server/scoring_bridge.py` → `app/services/scoring_engine.py` | 20-dimension composite score |
| **Integrations** | `server/src/services/integrations/` | Bureau, tax mock clients |
| **Policies** | `server/src/data/government-policies.ts` | Scheme catalog by sector |
| **Store** | `server/src/services/store.ts` | Assessment persistence |
| **Reports** | `server/src/services/reports/` | JSON + HTML credit reports |
| **DB** | `server/src/db/` | SQLite schema + seed data |
| **Frontend** | `frontend/` | Bank, MSME, govt, regulatory portals |
| **Legacy API** | `app/api/routes.py` | FastAPI endpoints (optional) |

## Agentic Orchestration

Every stored assessment (bank assess, MSME quick assess) triggers **27 AI agents** across **6 phases**:

1. **Enrichment** — bureau/tax/legal/document summary
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
| AI Agents | No `OPENAI_API_KEY` | `sk-*` key set (LLM narratives) |

## Response Structure

Every assessment returns:

| Field | Description |
|---|---|
| `overall_score` | Weighted 0–100 composite |
| `grade` | Letter grade A+ to F |
| `dimension_scores` | 20 scored dimensions with insights |
| `risk_indicators` | Actionable risk flags |
| `key_insights` | Top narrative insights |
| `data_gaps` | Missing inputs with severity |
| `recommended_improvements` | Actionable recommendations |
| `advanced_intelligence` | Integration status, peer percentile |
| `agent_insights` | Full orchestration output (stored assessments) |

## Deployment

```bash
cd server && npm install
pip install -r requirements.txt
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
| Node platform + agents | `cd server && npm test` | 23 Vitest tests (platform + snapshots) |
| Python scoring unit | `pytest tests/test_scoring.py -v` | Dimension scorers, engine |
| Python advanced | `pytest tests/test_advanced.py -v` | ESG, peer, geo, supply chain |
| Python integrations | `pytest tests/test_integrations.py -v` | Bureau, tax, legal clients |
| Python API | `pytest tests/test_api_assess.py -v` | Legacy FastAPI assessment |

**Regenerate API snapshots** (Node.js golden files):

```bash
cd server && npm run generate:snapshots && npm test
```

Snapshot files live in `tests/snapshots/`. See [PRODUCT_SNAPSHOTS.md](./PRODUCT_SNAPSHOTS.md).
