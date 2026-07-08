# Node.js Platform Server

Primary runtime for Financial Health Score **v2.1** — multi-stakeholder MSME intelligence with **27-agent orchestration**.

## Quick Start

```bash
cd server && npm install
pip install -r requirements.txt    # Python scoring bridge
cp .env.example .env
npm run dev          # development with hot reload
```

Platform: http://localhost:8080/app/index.html  
API health: http://localhost:8080/api/v1/health

## Architecture

```
server/
├── src/
│   ├── index.ts              # Express entry (listen + static frontend)
│   ├── app.ts                # createApp() — shared by tests & snapshots
│   ├── routes/               # Auth + API routes
│   ├── services/
│   │   ├── agents/           # 27-agent orchestration (6 phases)
│   │   ├── integrations/     # Bureau, tax mock clients
│   │   ├── scoring/bridge.ts # Python scoring bridge
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

| Stakeholder | Roles | Portal |
|---|---|---|
| **Bank** | bank_admin, bank_credit, bank_risk, bank_rm | `/app/bank/` |
| **MSME** | msme_owner, msme_viewer | `/app/msme/` |
| **Government** | govt_admin, govt_scheme_officer, govt_sidbi_officer | `/app/govt/` |
| **Regulatory** | reg_rbi_supervisor, reg_gstn_officer, reg_mca_officer, reg_nbfc_reviewer | `/app/regulatory/` |

## Demo Credentials

Retrieve all credentials: `GET /api/v1/auth/demo-credentials`

| Stakeholder | Email | Password |
|---|---|---|
| Bank | `credit@idbi.bank.in` | `IDBI@2026` |
| MSME | `rajesh@shreeganesh.in` | `MSME@2026` |
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
cd server && npm test              # 33 tests (platform + snapshots + scoring parity)
npm run generate:snapshots         # Regenerate tests/snapshots/*.json
```

| Test file | Coverage |
|---|---|
| `tests/platform.test.ts` | Auth, agents, bank/MSME/govt/regulatory flows |
| `tests/snapshots.test.ts` | Golden-file API response regression |
| `tests/scoring.test.ts` | Node scoring engine parity with Python |

Snapshot catalog: [PRODUCT_SNAPSHOTS.md](./PRODUCT_SNAPSHOTS.md)

Python unit tests (`pytest`) still cover the scoring engine independently.
