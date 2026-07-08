#!/usr/bin/env python3
"""stdin/stdout bridge so Node.js server can invoke the Python scoring engine."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.data.sample_msme import build_demo_request
from app.models.schemas import AssessmentRequest, AudienceRole
from app.services.scoring_engine import scoring_engine


def main() -> None:
    payload = json.load(sys.stdin)
    mode = payload.get("mode", "assess")

    if mode == "demo":
        audience = AudienceRole(payload.get("audience", "credit_team"))
        request = build_demo_request(audience=audience)
        carbon_data = payload.get("carbon_data")
        result = scoring_engine.assess(request, carbon_data, enrichment_log=payload.get("enrichment_log"))
    else:
        request = AssessmentRequest.model_validate(payload["request"])
        result = scoring_engine.assess(
            request,
            payload.get("carbon_data"),
            enrichment_log=payload.get("enrichment_log"),
        )

    print(json.dumps(result.model_dump(mode="json"), default=str))


if __name__ == "__main__":
    main()
