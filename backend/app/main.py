from datetime import datetime, timezone
from random import choice, randint
from typing import List
import numpy as np
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sklearn.ensemble import IsolationForest
from .database import Base, engine, get_db
from .models import SecurityEvent, Detection, Incident
from .schemas import EventOut, DetectionOut, IncidentOut

Base.metadata.create_all(bind=engine)
app = FastAPI(title="CloudSentinel API", version="0.1.0",
              description="University demo: AI-assisted security log analysis with simulated response.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def severity_for(score: int) -> str:
    if score >= 75: return "Critical"
    if score >= 50: return "High"
    if score >= 25: return "Medium"
    return "Low"

def calculate_risk(event: SecurityEvent, anomaly: float) -> tuple[int, str]:
    # IsolationForest decision_function is larger for normal records; map anomaly to 0..100.
    ml_risk = max(0, min(100, int((0.15 - anomaly) * 300)))
    rule_risk = 0
    reasons = []
    if event.failed_logins >= 8:
        rule_risk = max(rule_risk, 85); reasons.append(f"{event.failed_logins} failed logins indicate possible brute force")
    if event.requests_per_minute >= 120:
        rule_risk = max(rule_risk, 75); reasons.append(f"Request rate is unusually high ({event.requests_per_minute}/min)")
    if event.distinct_resources >= 8:
        rule_risk = max(rule_risk, 65); reasons.append(f"Access touched {event.distinct_resources} distinct resources")
    if event.unusual_hour:
        rule_risk = max(rule_risk, 40); reasons.append("Activity occurred during an unusual hour")
    risk = max(rule_risk, ml_risk)
    if not reasons and ml_risk >= 25:
        reasons.append("Machine-learning model marked the feature pattern as unusual")
    if not reasons:
        reasons.append("No high-confidence rule matched; activity appears low risk")
    return risk, "; ".join(reasons)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "CloudSentinel API", "mode": "demo"}

@app.get("/api/events", response_model=List[EventOut])
def list_events(db: Session = Depends(get_db)):
    return list(db.scalars(select(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(100)))

@app.post("/api/demo/generate")
def generate_demo_events(db: Session = Depends(get_db)):
    samples = [
        ("normal", 0, 22, 2, 0, "Routine dashboard access"),
        ("login", 1, 18, 1, 0, "Normal login"),
        ("login", 12, 15, 1, 1, "Repeated failed authentication"),
        ("api_access", 0, 180, 10, 1, "Burst of API requests across resources"),
        ("storage_access", 2, 34, 9, 1, "Unusual resource access pattern"),
        ("login", 9, 12, 1, 1, "Possible brute-force pattern"),
        ("api_access", 0, 16, 2, 0, "Routine API request"),
    ]
    for i in range(18):
        typ, failed, rpm, resources, hour, note = choice(samples)
        event = SecurityEvent(
            actor=choice(["demo-analyst", "svc-app", "guest-user", "ops-user"]),
            source_ip=choice(["192.0.2.10", "198.51.100.21", "203.0.113.7"]),
            event_type=typ, failed_logins=failed, requests_per_minute=rpm,
            distinct_resources=resources, unusual_hour=hour, note=note,
            timestamp=datetime.now(timezone.utc), analyzed=0
        )
        db.add(event)
    db.commit()
    return {"created": 18, "message": "Synthetic demo events generated."}

@app.post("/api/analyze")
def analyze_events(db: Session = Depends(get_db)):
    events = list(db.scalars(select(SecurityEvent).where(SecurityEvent.analyzed == 0)))
    if not events:
        return {"analyzed": 0, "message": "No unanalyzed events. Generate demo events first."}
    features = np.array([[e.failed_logins, e.requests_per_minute, e.distinct_resources, e.unusual_hour] for e in events], dtype=float)
    # Fit a small demo model against generated records; for production use a separately trained, validated model.
    model = IsolationForest(n_estimators=100, contamination=0.2, random_state=42)
    model.fit(features)
    decisions = model.decision_function(features)
    for event, decision in zip(events, decisions):
        risk, explanation = calculate_risk(event, float(decision))
        detection = Detection(
            event=event, anomaly_score=round(float(decision), 4),
            risk_score=risk, severity=severity_for(risk),
            method="Isolation Forest + Rules", explanation=explanation
        )
        db.add(detection)
        event.analyzed = 1
        if risk >= 50:
            db.add(Incident(detection=detection, title=f"{severity_for(risk)} risk: {event.event_type}"))
    db.commit()
    return {"analyzed": len(events), "message": "Analysis complete."}

@app.get("/api/detections", response_model=List[DetectionOut])
def list_detections(db: Session = Depends(get_db)):
    rows = db.execute(select(Detection, SecurityEvent).join(SecurityEvent).order_by(Detection.id.desc()).limit(100)).all()
    return [
        DetectionOut(id=d.id, event_id=e.id, anomaly_score=d.anomaly_score, risk_score=d.risk_score,
                     severity=d.severity, method=d.method, explanation=d.explanation,
                     actor=e.actor, source_ip=e.source_ip, event_type=e.event_type, timestamp=e.timestamp)
        for d, e in rows
    ]

@app.get("/api/incidents", response_model=List[IncidentOut])
def list_incidents(db: Session = Depends(get_db)):
    rows = db.execute(select(Incident, Detection, SecurityEvent)
                      .join(Detection, Incident.detection_id == Detection.id)
                      .join(SecurityEvent, Detection.event_id == SecurityEvent.id)
                      .order_by(Incident.id.desc())).all()
    return [
        IncidentOut(id=i.id, detection_id=d.id, title=i.title, status=i.status,
                    response_note=i.response_note, created_at=i.created_at,
                    risk_score=d.risk_score, severity=d.severity, actor=e.actor, source_ip=e.source_ip)
        for i, d, e in rows
    ]

@app.post("/api/incidents/{incident_id}/simulate-containment")
def simulate_containment(incident_id: int, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident.status = "Contained"
    incident.response_note = "Simulated containment only; no real account or resource was changed."
    db.commit()
    return {"incident_id": incident.id, "status": incident.status, "note": incident.response_note}

@app.get("/api/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    events = db.scalar(select(func.count(SecurityEvent.id))) or 0
    detections = db.scalar(select(func.count(Detection.id))) or 0
    critical = db.scalar(select(func.count(Detection.id)).where(Detection.severity == "Critical")) or 0
    open_incidents = db.scalar(select(func.count(Incident.id)).where(Incident.status == "Open")) or 0
    return {"events": events, "detections": detections, "critical": critical, "open_incidents": open_incidents}

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

STATIC_DIR = Path(__file__).resolve().parents[2] / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    @app.get("/", include_in_schema=False)
    def frontend_index():
        return FileResponse(STATIC_DIR / "index.html")
