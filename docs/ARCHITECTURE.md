# Architecture

Financial Health Score is a **FastAPI** service that ingests consented MSME financial, operational, and alternative data, enriches it via external integrations, and produces an explainable **20-dimension Financial Health Score** for credit, risk, and relationship management teams.

Developed for **IDBI Innovate 2026** by SUSTAINOW TECHNOLOGIES.

## System Context

```mermaid
flowchart TB
    subgraph Clients
        CT[Credit Teams]
        RT[Risk Teams]
        RM[Relationship Managers]
        PA[Portfolio Analysts]
    end

    subgraph FHS[Financial Health Score API]
        API[FastAPI REST API]
        SE[Scoring Engine]
        AS[Advanced Scoring]
        EN[Enrichment Pipeline]
    end

    subgraph External
        CI[ci.sustainow.in Carbon Intelligence]
        BU[CIBIL / CRISIL Bureau]
        TX[GSTN / ITR Tax]
        LG[e-Courts / MCA Legal]
        DOC[Document OCR]
    end

    CT & RT & RM & PA --> API
    API --> EN
    EN --> BU & TX & LG & DOC & CI
    EN --> SE
    SE --> AS
    SE --> API
```

## Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant API as FastAPI Routes
    participant Enrich as Enrichment Pipeline
    participant CI as Carbon Intelligence
    participant Engine as Scoring Engine
    participant Adv as Advanced Scoring

    Client->>API: POST /api/v1/assess
    API->>Enrich: enrich_financial_data (if auto_enrich)
    Enrich->>BU: Bureau pull (GSTIN/PAN)
    Enrich->>TX: Tax verify
    Enrich->>LG: Litigation search
    Enrich->>DOC: Document OCR
    API->>CI: fetch_full_intelligence (if msme_id)
    API->>Engine: assess(request, carbon_data, enrichment_log)
    Engine->>Adv: ESG, supply chain, geo, peer dimensions
    Engine-->>API: FinancialHealthScoreResult
    API-->>Client: JSON response
```

## Component Map

| Layer | Module | Responsibility |
|---|---|---|
| **API** | `app/api/routes.py` | REST endpoints, orchestration |
| **Models** | `app/models/schemas.py` | Pydantic request/response schemas |
| **Config** | `app/config.py` | Environment settings, API keys |
| **Scoring** | `app/services/scoring_engine.py` | 15 core dimension scorers |
| **Advanced** | `app/services/advanced_scoring.py` | 5 advanced dimension scorers |
| **Enrichment** | `app/services/enrichment.py` | Auto-fetch bureau/tax/legal/OCR |
| **Integrations** | `app/services/integrations.py` | External API clients |
| **Carbon** | `app/services/carbon_intelligence.py` | ci.sustainow.in client |
| **Credit** | `app/services/credit_ratings.py` | CRISIL rating mapping |
| **Data** | `app/data/*` | Benchmarks, policies, certifications, demo MSME |

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

### Dimension Groups

| Group | Dimensions | Combined Weight |
|---|---|---|
| Financial Core | resilience, cash flow, payment, credit history | 29% |
| Operational | stability, certifications, supply chain | 14% |
| People & Governance | founder, governance diversity | 11% |
| Market & Demand | sentiment, product demand, peer benchmark | 12% |
| Compliance & Risk | legal, tax, geographic, insurance | 16% |
| Sustainability | carbon, ESG, government policy | 13% |
| Alternative Data | concentration, bank signals | 5% |

## Data Model

```mermaid
erDiagram
    AssessmentRequest ||--|| FinancialDataInput : contains
    FinancialDataInput ||--|| MSMEProfile : profile
    FinancialDataInput ||--|| AccountingSnapshot : accounting
    FinancialDataInput |o--o| FounderProfile : founder
    FinancialDataInput |o--o| CreditBureauProfile : credit_bureau
    FinancialDataInput |o--o| LegalComplianceProfile : legal_compliance
    FinancialDataInput |o--o| TaxComplianceProfile : tax_compliance
    FinancialDataInput |o--o| ESGDisclosureProfile : esg_disclosure
    FinancialDataInput |o--o| SupplyChainProfile : supply_chain
    FinancialDataInput |o--o| InsuranceProfile : insurance
    FinancialDataInput |o--o| GeographicProfile : geographic
    FinancialHealthScoreResult ||--|{ DimensionScore : dimension_scores
    FinancialHealthScoreResult ||--o| AdvancedIntelligenceSummary : advanced_intelligence
```

## Integration Modes

| Integration | Mock Trigger | Live Trigger |
|---|---|---|
| Carbon Intelligence | No `CARBON_INTELLIGENCE_API_KEY` | `ci_live_*` key set |
| Credit Bureau | `USE_MOCK_INTEGRATIONS=true` | `CREDIT_BUREAU_API_KEY` set |
| Tax Verification | `USE_MOCK_INTEGRATIONS=true` | `TAX_API_KEY` set |
| Legal Search | `USE_MOCK_INTEGRATIONS=true` | `LEGAL_API_KEY` set |
| Document OCR | `USE_MOCK_INTEGRATIONS=true` | `DOCUMENT_API_KEY` set |

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
| `carbon_intelligence` | ci.sustainow.in summary |
| `government_policy_assessment` | Scheme enrollment analysis |
| `metadata` | Sources, enrichment log, bonuses |

## Deployment

```bash
pip install -r requirements.txt
cp .env.example .env
python run.py          # Development
# or
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Health check: `GET /api/v1/health`  
OpenAPI docs: `GET /docs`

## Testing Strategy

| Suite | File | Coverage |
|---|---|---|
| Unit scoring | `tests/test_scoring.py` | Dimension scorers, engine |
| Advanced | `tests/test_advanced.py` | ESG, peer, geo, supply chain |
| Integrations | `tests/test_integrations.py` | Bureau, tax, legal, OCR clients |
| API | `tests/test_api_assess.py` | Assessment endpoints |
| Snapshots | `tests/test_snapshots.py` | Golden-file regression |

Regenerate snapshots: `python scripts/generate_snapshots.py`
