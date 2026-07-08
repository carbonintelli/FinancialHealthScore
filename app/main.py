"""Financial Health Score — FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s v%s | Carbon Intelligence: %s",
        settings.app_name,
        settings.app_version,
        "connected" if settings.has_carbon_api_key else "mock mode",
    )
    yield
    logger.info("Shutting down %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    description="""
## AI-Powered Alternative Data Intelligence for MSME Credit Decisions

**Financial Health Score** analyses consented MSME financial and operational data—including
transactions, utility bills, fuel invoices, accounting records, and business documents—to
assess financial resilience beyond traditional credit metrics.

### Integration with Carbon Intelligence (ci.sustainow.in)

This service ingests carbon intelligence from [Sustainow Carbon Intelligence](https://ci.sustainow.in)
to enrich assessments with:

- Carbon footprint and intensity metrics
- Energy cost exposure and transition risk
- Transaction analytics and payment behaviour
- Reporting readiness for green finance

### Target Users

- **Credit Teams** — Complement traditional MSME credit assessment
- **Risk Teams** — Identify early financial and operational risk signals
- **Relationship Managers** — Discover green-finance and efficiency opportunities
- **Portfolio Analysts** — Improve credit monitoring and portfolio intelligence

### IDBI Innovate 2026

Developed for the IDBI Innovate 2026 competition for MSMEs.
    """,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/", tags=["System"])
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "description": "AI-Powered Alternative Data Intelligence for MSME Credit Decisions",
        "dimension_count": 20,
        "docs": "/docs",
        "documentation": {
            "architecture": "docs/ARCHITECTURE.md",
            "api": "docs/API.md",
            "scoring": "docs/SCORING.md",
            "snapshots": "docs/PRODUCT_SNAPSHOTS.md",
        },
        "demo": "/api/v1/assess/demo",
        "health": "/api/v1/health",
        "integrations": "/api/v1/integrations/status",
        "carbon_intelligence": "https://ci.sustainow.in",
        "competition": "IDBI Innovate 2026",
    }
