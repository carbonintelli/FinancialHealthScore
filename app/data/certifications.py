"""ISO and operational certification reference for MSME scoring."""

from __future__ import annotations

CERTIFICATION_WEIGHTS: dict[str, float] = {
    "iso 9001": 15,
    "iso 14001": 12,
    "iso 45001": 12,
    "iso 27001": 10,
    "iso 50001": 10,
    "iatf 16949": 18,
    "iatf": 18,
    "fssai": 14,
    "bis": 12,
    "ce marking": 10,
    "zed bronze": 8,
    "zed silver": 12,
    "zed gold": 16,
    "zed diamond": 20,
    "greenco": 14,
    "oshas 18001": 10,
    "sa 8000": 10,
    "gmp": 12,
    "haccp": 12,
    "pci-dss": 8,
    "reach": 8,
}


def certification_value(cert_name: str) -> float:
    """Return score contribution for a certification (0-20 scale per cert)."""
    normalized = cert_name.lower().strip()
    for key, weight in CERTIFICATION_WEIGHTS.items():
        if key in normalized:
            return weight
    return 8.0  # generic certified standard
