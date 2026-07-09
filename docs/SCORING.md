# Scoring Model

Financial Health Score (FHS) uses **20 weighted dimensions** producing a 0–100 composite with **credit grade**, **credit risk rating**, and evidence-linked insights.

Display labels for dimensions and risk ratings: [TERMINOLOGY.md](./TERMINOLOGY.md).

## Dimension Weights

| # | Dimension | Weight | Primary Inputs |
|---|---|---|---|
| 1 | Financial Resilience | 9% | Current ratio, debt-to-assets, operating margin |
| 2 | Promoter Capability | 8% | Experience, CIBIL, management depth, succession |
| 3 | Cash Flow Adequacy | 7% | Cash flows, CI transaction analytics |
| 4 | Payment Discipline | 7% | Payment records, EMI discipline |
| 5 | Credit History & Debt Servicing | 6% | CRISIL, past debts, DSCR, CMR |
| 6 | Operational Stability | 6% | Opex ratio, energy exposure, tenure |
| 7 | Legal Compliance | 6% | Company/founder lawsuits, criminal cases |
| 8 | Carbon Transition Risk | 5% | CI carbon summary, energy exposure |
| 9 | Alternative Credit Signals | 5% | AA/UPI/EPFO signals, supplier/customer concentration, bank statements |
| 10 | Market Sentiment | 5% | NPS, reviews, media, retention |
| 11 | Tax Compliance | 4% | ITR, income tax paid, advance tax, TDS |
| 12 | Operational Certifications | 4% | ISO, IATF, ZED, quality audits |
| 13 | Government Policy Alignment | 4% | Schemes + statutory compliance |
| 14 | Product Demand Outlook | 4% | Order book, sector growth, capacity |
| 15 | ESG Disclosure | 4% | BRSR, GHG inventory, ESG report |
| 16 | Supply Chain Resilience | 4% | Stress test, alternate suppliers |
| 17 | Corporate Governance | 3% | Female founders/directors |
| 18 | Insurance & Business Continuity | 3% | BI, property, liability coverage |
| 19 | Geographic Concentration Risk | 3% | State index, flood zone, cluster |
| 20 | Peer Benchmarking | 3% | Percentile vs sector cohort |

**Total: 100%**

## Grade & Credit Risk Mapping

| FHS Score | Credit Grade | Credit Risk Rating (API) | Display label |
|---|---|---|---|
| 90–100 | A+ | `low` | Low Credit Risk |
| 80–89 | A | `low` | Low Credit Risk |
| 70–79 | B+ | `low` / `moderate` | Low–Moderate Credit Risk |
| 60–69 | B | `moderate` | Moderate Credit Risk |
| 50–59 | C+ | `elevated` | Elevated Credit Risk |
| 40–49 | C | `elevated` | Elevated Credit Risk |
| 30–39 | D | `high` | High Credit Risk |
| 0–29 | F | `critical` | Critical Credit Risk |

## Governance Bonus

Women-led MSMEs receive up to **+2.5 points** on the overall score.

## Thin-File / NTC / NTB Scoring

For **New-to-Credit (NTC)** and **New-to-Bank (NTB)** enterprises lacking traditional bureau history, the platform applies **thin-file scoring mode**:

| Segment | Trigger |
|---|---|
| `NTC` | No credit bureau history (CRISIL/CIBIL) |
| `NTB` | No established bank relationship |
| `NTC_NTB` | Both conditions apply |
| `standard` | Full bureau + bank data available |

When thin-file mode is active, dimension weights are rebalanced to up-weight alternate data sources (GST, UPI, AA, EPFO) and down-weight bureau-dependent dimensions. Weights are renormalized to 100%.

Force a segment via `profile.borrower_segment` in the assessment request, or set `thin_file_mode: true`.

See [ECOSYSTEM.md](./ECOSYSTEM.md) for weight adjustment tables and API examples.

## Demo MSME Snapshot

**Shree Ganesh Auto Components Pvt Ltd**: FHS **78.1 / B+** (Node scoring engine baseline), 20 dimensions.

See `tests/snapshots/demo_assessment_credit.json` for full response snapshot.
