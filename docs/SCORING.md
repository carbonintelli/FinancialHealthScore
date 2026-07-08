# Scoring Model

Financial Health Score uses **20 weighted dimensions** producing a 0–100 composite with letter grade, risk level, and evidence-linked insights.

## Dimension Weights

| # | Dimension | Weight | Primary Inputs |
|---|---|---|---|
| 1 | Financial Resilience | 9% | Current ratio, debt-to-assets, operating margin |
| 2 | Founder Capability | 8% | Experience, CIBIL, management depth, succession |
| 3 | Cash Flow Health | 7% | Cash flows, CI transaction analytics |
| 4 | Payment Behaviour | 7% | Payment records, EMI discipline |
| 5 | Credit History & Debt Servicing | 6% | CRISIL, past debts, DSCR, CMR |
| 6 | Operational Stability | 6% | Opex ratio, energy exposure, tenure |
| 7 | Legal Compliance | 6% | Company/founder lawsuits, criminal cases |
| 8 | Carbon Transition Risk | 5% | CI carbon summary, energy exposure |
| 9 | Alternative Data Signals | 5% | Supplier/customer concentration |
| 10 | Market Sentiment | 5% | NPS, reviews, media, retention |
| 11 | Tax Compliance | 4% | ITR, income tax paid, advance tax, TDS |
| 12 | Operational Certifications | 4% | ISO, IATF, ZED, quality audits |
| 13 | Government Policy Alignment | 4% | Schemes + statutory compliance |
| 14 | Product Demand Outlook | 4% | Order book, sector growth, capacity |
| 15 | ESG Disclosure | 4% | BRSR, GHG inventory, ESG report |
| 16 | Supply Chain Resilience | 4% | Stress test, alternate suppliers |
| 17 | Governance Diversity | 3% | Female founders/directors |
| 18 | Insurance & Business Continuity | 3% | BI, property, liability coverage |
| 19 | Geographic Risk | 3% | State index, flood zone, cluster |
| 20 | Peer Benchmark | 3% | Percentile vs sector cohort |

**Total: 100%**

## Grade Mapping

| Score | Grade | Risk Level |
|---|---|---|
| 90–100 | A+ | Low |
| 80–89 | A | Low |
| 70–79 | B+ | Low–Moderate |
| 60–69 | B | Moderate |
| 50–59 | C+ | Elevated |
| 40–49 | C | Elevated |
| 30–39 | D | High |
| 0–29 | F | Critical |

## Governance Bonus

Women-led MSMEs receive up to **+2.5 points** on the overall score.

## Demo MSME Snapshot

**Shree Ganesh Auto Components Pvt Ltd**: Score **78.1 / B+**, 20 dimensions, 0 data gaps.

See `tests/snapshots/demo_assessment_credit.json` for full response snapshot.
