# Product Snapshots

Golden-file snapshots of API responses for regression testing against the **Node.js platform** (v2.1.0).

## Regenerate

```bash
cd server
npm run generate:snapshots
npm test
```

Legacy Python snapshot generation (`python scripts/generate_snapshots.py`) is deprecated — snapshots now reflect the Node.js Express server.

## Demo Assessment — Credit Team

**Endpoint:** `GET /api/v1/assess/demo?audience=credit_team`

| Field | Value |
|---|---|
| Business | Shree Ganesh Auto Components Pvt Ltd |
| Overall Score | 77.3 |
| Grade | B+ |
| Risk Level | low |
| Dimensions | 20 |
| Governance Bonus | +1.1 |

### Dimension Scores (Demo MSME)

| Dimension | Score | Risk |
|---|---|---|
| financial_resilience | 64.4 | moderate |
| cash_flow_health | 57.7 | elevated |
| operational_stability | 79.2 | low |
| payment_behaviour | 80.0 | low |
| carbon_transition_risk | 56.6 | elevated |
| alternative_data_signals | 89.8 | low |
| founder_capability | 73.9 | moderate |
| market_sentiment | 79.6 | low |
| product_demand_outlook | 83.2 | low |
| government_policy_alignment | 76.6 | low |
| credit_history_debt_servicing | 81.2 | low |
| legal_compliance | 92.5 | low |
| tax_compliance | 93.6 | low |
| operational_certifications | 92.0 | low |
| governance_diversity | 65.8 | moderate |
| esg_disclosure | 72.3 | moderate |
| supply_chain_resilience | 90.4 | low |
| insurance_business_continuity | 84.5 | low |
| geographic_risk | 84.5 | low |
| peer_benchmark | 60.0 | elevated |

### Risk Indicators (Sample)

- Cash flow health elevated (inflow volatility 18.5%)
- Carbon transition risk (carbon intensity 0.42 kgCO₂/₹)

### Integrations Applied (Auto-enrich)

- credit_bureau (CIBIL/CRISIL mock)
- tax_verification (GSTN/ITR mock)
- legal_search (e-Courts mock)
- document_intelligence (3 documents validated)

## Snapshot Files

| File | Endpoint |
|---|---|
| `root.json` | `GET /api` |
| `health.json` | `GET /api/v1/health` |
| `integrations_status.json` | `GET /api/v1/integrations/status` |
| `demo_assessment_credit.json` | `GET /api/v1/assess/demo?audience=credit_team` |
| `demo_assessment_risk.json` | `GET /api/v1/assess/demo?audience=risk_team` |
| `policies_auto.json` | `GET /api/v1/policies/catalog?sector=auto_components` |
| `bureau_pull.json` | `POST /api/v1/integrations/bureau/pull` |
| `tax_verify.json` | `POST /api/v1/integrations/tax/verify` |
| `agents_architecture.json` | `GET /api/v1/agents/architecture` |
| `demo_credentials.json` | `GET /api/v1/auth/demo-credentials` |
| `msme_orchestration.json` | `POST /api/v1/msme/assess/quick` → `agent_insights` |

Volatile fields (`assessment_id`, `orchestration_id`, `run_id`, timestamps, etc.) are normalized to `<UUID>` / `<TIMESTAMP>` in golden files.

## Architecture Diagram

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system context, request flow, and component map.
