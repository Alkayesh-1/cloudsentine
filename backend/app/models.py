from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def utcnow():
    return datetime.now(timezone.utc)

class SecurityEvent(Base):
    __tablename__ = "security_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    actor: Mapped[str] = mapped_column(String(100), default="demo-user")
    source_ip: Mapped[str] = mapped_column(String(64), default="192.0.2.10")
    event_type: Mapped[str] = mapped_column(String(80), default="login")
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    requests_per_minute: Mapped[int] = mapped_column(Integer, default=1)
    distinct_resources: Mapped[int] = mapped_column(Integer, default=1)
    unusual_hour: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[str] = mapped_column(Text, default="")
    analyzed: Mapped[int] = mapped_column(Integer, default=0)
    detection: Mapped["Detection"] = relationship(back_populates="event", uselist=False, cascade="all, delete-orphan")

class Detection(Base):
    __tablename__ = "detections"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("security_events.id"), unique=True, index=True)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    severity: Mapped[str] = mapped_column(String(20), default="Low")
    method: Mapped[str] = mapped_column(String(40), default="Rules + ML")
    explanation: Mapped[str] = mapped_column(Text, default="")
    event: Mapped[SecurityEvent] = relationship(back_populates="detection")
    incident: Mapped["Incident"] = relationship(back_populates="detection", uselist=False, cascade="all, delete-orphan")

class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    detection_id: Mapped[int] = mapped_column(ForeignKey("detections.id"), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), default="Open")
    response_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    detection: Mapped[Detection] = relationship(back_populates="incident")
