from datetime import datetime
from pydantic import BaseModel, ConfigDict

class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: datetime
    actor: str
    source_ip: str
    event_type: str
    failed_logins: int
    requests_per_minute: int
    distinct_resources: int
    unusual_hour: int
    note: str
    analyzed: int

class DetectionOut(BaseModel):
    id: int
    event_id: int
    anomaly_score: float
    risk_score: int
    severity: str
    method: str
    explanation: str
    actor: str
    source_ip: str
    event_type: str
    timestamp: datetime

class IncidentOut(BaseModel):
    id: int
    detection_id: int
    title: str
    status: str
    response_note: str
    created_at: datetime
    risk_score: int
    severity: str
    actor: str
    source_ip: str
