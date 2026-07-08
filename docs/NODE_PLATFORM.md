# Node.js Platform Server

Primary runtime for Financial Health Score v2.0 — multi-stakeholder MSME intelligence with AI agents.

## Quick Start

```bash
cd server && npm install
npm run dev          # development with hot reload
# or from repo root:
npm run install:all && npm run dev
```

Platform: http://localhost:8080/app/index.html

## Architecture

```
server/
├── src/
│   ├── index.ts              # Express app entry
│   ├── routes/               # Auth + API routes
│   ├── services/
│   │   ├── agents/           # AI agent orchestration
│   │   ├── scoring/bridge.ts # Python scoring bridge
│   │   ├── store.ts          # Assessment persistence
│   │   └── reports/          # HTML + JSON reports
│   └── db/                   # SQLite + seed data
├── scoring_bridge.py         # Invokes Python scoring engine
└── tests/                    # Vitest integration tests
```

## AI Agents

| Agent | Trigger | Purpose |
|---|---|---|
| `credit_analysis` | Assessment complete | Credit committee recommendation |
| `policy_advisory` | Govt portal | Scheme eligibility & enrollment |
| `regulatory_compliance` | Regulatory review | RBI/GSTN/MCA compliance flags |
| `data_enrichment` | Auto-enrich | Bureau/tax/legal pull summary |
| `report_narrative` | Report generation | Executive summary narrative |

Set `OPENAI_API_KEY` for LLM-enhanced agent outputs. Without it, agents use deterministic rule-based intelligence.

## Stakeholders & Roles

| Stakeholder | Roles | Portal |
|---|---|---|
| **Bank** | bank_admin, bank_credit, bank_risk, bank_rm | `/app/bank/` |
| **MSME** | msme_owner, msme_viewer | `/app/msme/` |
| **Government** | govt_admin, govt_scheme_officer, govt_sidbi_officer | `/app/govt/` |
| **Regulatory** | reg_rbi_supervisor, reg_gstn_officer, reg_mca_officer, reg_nbfc_reviewer | `/app/regulatory/` |

## Demo Credentials

| Stakeholder | Email | Password |
|---|---|---|
| Bank | `credit@idbi.bank.in` | `IDBI@2026` |
| MSME | `rajesh@shreeganesh.in` | `MSME@2026` |
| Government | `admin@msme.gov.in` | `GOVT@2026` |
| Regulatory | `supervisor@rbi.org.in` | `REG@2026` |

## Scoring Engine

The Node server invokes the Python scoring engine via `scoring_bridge.py` for exact 20-dimension parity. Requires Python 3 with `app/` dependencies installed (`pip install -r requirements.txt`).

## Tests

```bash
cd server && npm test    # 7 integration tests
```
