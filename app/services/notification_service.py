"""User notifications."""

from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.db.models import Notification


def list_notifications(db: Session, user_id: int, unread_only: bool = False) -> list[Notification]:
    q = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    return list(db.scalars(q.order_by(desc(Notification.created_at)).limit(50)))


def unread_count(db: Session, user_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    ) or 0


def mark_read(db: Session, notification_id: int, user_id: int) -> Notification | None:
    note = db.get(Notification, notification_id)
    if note and note.user_id == user_id:
        note.is_read = True
        db.commit()
        db.refresh(note)
    return note


def create_notification(db: Session, user_id: int, title: str, message: str, category: str = "info") -> Notification:
    note = Notification(user_id=user_id, title=title, message=message, category=category)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
