"""Authentication API routes."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.security import create_access_token, hash_password, verify_password
from app.config import settings
from app.db.models import Organization, OrganizationType, PortfolioLink, User, UserRole
from app.db.session import get_db
from app.models.platform_schemas import DemoCredentials, LoginRequest, MSMERegisterRequest, TokenResponse, UserProfile

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def _user_profile(user: User, org: Organization) -> UserProfile:
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=org.id,
        organization_name=org.name,
        organization_type=org.org_type.value,
        msme_id=user.msme_id,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    org = db.get(Organization, user.organization_id)
    token = create_access_token(
        str(user.id),
        extra={"role": user.role.value, "org_id": user.organization_id},
    )
    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.jwt_expire_minutes,
        user=_user_profile(user, org),
    )


@router.get("/me", response_model=UserProfile)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.get(Organization, user.organization_id)
    return _user_profile(user, org)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_msme(payload: MSMERegisterRequest, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=400, detail="Email already registered")

    msme_id = f"msme-{secrets.token_hex(4)}"
    org = Organization(
        name=payload.business_name,
        org_type=OrganizationType.MSME,
        registration_id=payload.udyam_number,
    )
    db.add(org)
    db.flush()

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.MSME_OWNER,
        organization_id=org.id,
        msme_id=msme_id,
    )
    db.add(user)

    idbi = db.scalar(select(Organization).where(Organization.registration_id == "BANK-IDBI-001"))
    if idbi:
        db.add(
            PortfolioLink(
                bank_org_id=idbi.id,
                msme_id=msme_id,
                business_name=payload.business_name,
                sector=payload.sector,
                gstin=payload.gstin,
            )
        )

    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id), extra={"role": user.role.value})
    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.jwt_expire_minutes,
        user=_user_profile(user, org),
    )


@router.get("/demo-credentials", response_model=DemoCredentials)
def demo_credentials():
    """Demo login credentials for bank and MSME portals."""
    return DemoCredentials(
        bank=[
            {"email": "admin@idbi.bank.in", "password": "IDBI@2026", "role": "Bank Admin"},
            {"email": "credit@idbi.bank.in", "password": "IDBI@2026", "role": "Credit Team"},
            {"email": "risk@idbi.bank.in", "password": "IDBI@2026", "role": "Risk Team"},
            {"email": "rm@idbi.bank.in", "password": "IDBI@2026", "role": "Relationship Manager"},
        ],
        msme=[
            {"email": "rajesh@shreeganesh.in", "password": "MSME@2026", "role": "MSME Owner (Auto Components)"},
            {"email": "founder@greenfab.in", "password": "MSME@2026", "role": "MSME Owner (Textiles)"},
        ],
    )
