# Node.js Platform Server

Primary runtime for Financial Health Score (FHS) **v2.1** — Node.js **Express API** + **React TypeScript SPA**.

## Quick Start

```bash
npm run install:all    # from repo root
cp .env.example .env
npm run dev            # API :8080 + Vite :5173
```

Production:

```bash
npm run build && npm start
```

Platform UI: http://localhost:8080/app/  
API health: http://localhost:8080/api/v1/health

## Frontend (React SPA)

The UI lives in `client/` — **React 19**, **TypeScript**, **React Router**, **Vite**.

| Command | Description |
|---|---|
| `cd client && npm run dev` | Vite dev server with `/api` proxy to Express |
| `cd client && npm run build` | Production bundle → `client/dist/` |
| `npm run dev` (root) | Runs API + Vite concurrently |

Express serves `client/dist` at `/app/` with SPA fallback routing (`server/src/frontend.ts`). The legacy `frontend/` HTML folder is used only when the React build is missing.

### Client structure

```
client/src/
├── api/           # fetch client, auth storage, types
├── components/    # AppLayout, ScoreHero, StatCard, …
├── hooks/         # useAuth (JWT context)
├── lib/           # terminology.ts, portals.tsx, format.ts
├── pages/         # bank/, msme/, govt/, regulatory/
└── styles/        # app.css
```

Terminology: [TERMINOLOGY.md](./TERMINOLOGY.md) — mirrored in `client/src/lib/terminology.ts`.

## Architecture

```
server/
├── src/
│   ├── index.ts              # Express entry (listen + static frontend)
│   ├── app.ts                # createApp() — shared by tests & snapshots
│   ├── routes/               # Auth + API routes
│   ├── services/
│   │   ├── agents/           # 27-agent orchestration (6 phases)
│   │   ├── scoring/          # Node.js 20-dimension scoring engine (default)
│   │   ├── integrations/     # Bureau, tax, Tally, Zoho, carbon clients
│   │   ├── store.ts          # Assessment persistence + orchestration
│   │   └── reports/          # HTML + JSON reports
│   ├── data/
│   │   └── government-policies.ts
│   ├── db/                   # SQLite + seed data
│   └── utils/
│       └── snapshot-normalize.ts
├── scripts/
│   └── generate-snapshots.ts # Regenerate tests/snapshots/*.json
├── scoring_bridge.py         # Invokes Python scoring engine
└── tests/
    ├── platform.test.ts      # Platform + agent integration tests
    └── snapshots.test.ts     # Golden-file API regression tests
```

## AI Agents

| Agent | Phase | Purpose |
|---|---|---|
| `data_enrichment` | 1 | Bureau/tax/legal/document pull summary |
| 20 × `dimension_agent` | 2 | Per-dimension risk analysis (parallel) |
| `risk_synthesis` | 3 | Composite risk profile |
| `health_score_synthesis` | 4 | Agent-validated score + governance bonus |
| `report_orchestration` | 5 | Credit decision narrative |
| `credit_analysis` | 6 | Credit committee recommendation |
| `policy_advisory` | 6 | Scheme eligibility & enrollment |
| `regulatory_compliance` | 6 | RBI/GSTN/MCA compliance flags |

Set `OPENAI_API_KEY` for LLM-enhanced agent narratives. Without it, agents use deterministic rule-based intelligence with identical structure.

See [AGENTIC_ARCHITECTURE.md](./AGENTIC_ARCHITECTURE.md).

## Stakeholders & Roles

| Stakeholder | Roles | Portal | UI label |
|---|---|---|---|
| **Lending Institution** | bank_admin, credit_team, risk_team, relationship_manager | `/app/bank/` | Lending Institution Portal |
| **Enterprise (MSME)** | msme_owner, msme_viewer | `/app/msme/` | Enterprise Portal |
| **Government** | govt_admin, scheme_officer, sidbi_officer | `/app/govt/` | MSME Policy Intelligence |
| **Regulatory** | reg_rbi_supervisor, reg_gstn_officer, reg_mca_officer, reg_nbfc_reviewer | `/app/regulatory/` | Regulatory Supervisory Portal |

## Demo Credentials

Retrieve all credentials: `GET /api/v1/auth/demo-credentials`

| Stakeholder | Email | Password |
|---|---|---|
| Lending Institution | `credit@idbi.bank.in` | `IDBI@2026` |
| Enterprise (MSME) | `rajesh@shreeganesh.in` | `MSME@2026` |
| Government | `admin@msme.gov.in` | `GOVT@2026` |
| Regulatory | `supervisor@rbi.org.in` | `REG@2026` |

## Scoring Engine

The **Node.js scoring engine** (`server/src/services/scoring/`) is the default runtime. It uses **20 parallel dimension scoring agents** (Phase 0 of agentic assessment) before the existing 27-agent orchestration pipeline interprets results.

```
Phase 0: dimension_scoring   → 20 parallel scoring agents (deterministic math)
Phase 1–6: orchestrator     → enrichment, dimension analysis, synthesis, reporting
```

Set `SCORING_ENGINE=python` to fall back to the legacy Python bridge (`server/scoring_bridge.py`) for comparison or migration.

### Architecture

```
server/src/services/scoring/
├── engine.ts              # assess() — orchestrates scoring agents + post-process
├── scoring-agents.ts      # runScoringAgents() — 20 parallel dimension agents
├── dimensions/            # One scorer per dimension (ported from Python)
├── post-process.ts        # Risk indicators, data gaps, recommendations
├── policy-assessment.ts   # Government scheme alignment
└── bridge.ts              # Routes to Node (default) or Python fallback
```

Demo MSME baseline: **78.1 / B+** (Shree Ganesh Auto Components Pvt Ltd).

Parity with Python is verified in `tests/scoring.test.ts`.

## Configuration

```env
PORT=8080
SECRET_KEY=your-secret-key
JWT_EXPIRE_MINUTES=480
DATABASE_URL=data/financial_health_node.db
USE_MOCK_INTEGRATIONS=true
OPENAI_API_KEY=              # Optional — LLM agent narratives
CARBON_INTELLIGENCE_API_KEY= # Optional — live CI data
SCORING_ENGINE=node          # node (default) | python (legacy bridge)
PYTHON_PATH=python3          # Only needed when SCORING_ENGINE=python
```

## Tests & Snapshots

```bash
cd server && npm test              # 35 tests (platform + snapshots + scoring parity)
npm run generate:snapshots         # Regenerate tests/snapshots/*.json
```

| Test file | Coverage |
|---|---|
| `tests/platform.test.ts` | Auth, agents, bank/MSME/govt/regulatory flows |
| `tests/snapshots.test.ts` | Golden-file API response regression |
| `tests/scoring.test.ts` | Node scoring engine parity with Python |

Snapshot catalog: [PRODUCT_SNAPSHOTS.md](./PRODUCT_SNAPSHOTS.md)

Terminology reference: [TERMINOLOGY.md](./TERMINOLOGY.md)

Python unit tests (`pytest`) still cover the scoring engine independently.
