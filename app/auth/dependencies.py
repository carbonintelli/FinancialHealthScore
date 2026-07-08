"""FastAPI auth dependencies."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.security import decode_access_token
from app.db.models import User, UserRole
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_roles(*roles: UserRole):
    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _checker


def require_bank_user(user: User = Depends(get_current_user)) -> User:
    bank_roles = {
        UserRole.BANK_ADMIN,
        UserRole.BANK_CREDIT,
        UserRole.BANK_RISK,
        UserRole.BANK_RM,
    }
    if user.role not in bank_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bank access only")
    return user


def require_msme_user(user: User = Depends(get_current_user)) -> User:
    if user.role not in {UserRole.MSME_OWNER, UserRole.MSME_VIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="MSME access only")
    return user
