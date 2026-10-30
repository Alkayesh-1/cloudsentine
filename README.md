# CloudSentinel — MVP

AI-assisted Cloud Security Monitoring & Incident Response demo.

## Stack
- React + Vite frontend
- FastAPI backend
- SQLite for easy local startup (PostgreSQL-ready via `DATABASE_URL`)
- Scikit-learn Isolation Forest anomaly detector
- Docker Compose

> This is a university demonstration MVP. It analyzes synthetic/demo logs and simulates response actions only. It does not monitor or change real cloud resources.

## Run locally

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

### Frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Demo flow
1. Open Dashboard.
2. Click **Generate demo events** to create benign and suspicious sample logs.
3. Click **Analyze events**.
4. Review detections and risk scores.
5. Open an incident and choose **Simulate containment**. This only updates the demo database.

## Oracle Cloud note
This MVP is prepared for container deployment, but it is not deployed to your Oracle account. Confirm current OCI Always Free availability, quotas, and regional capacity before creating resources. Do not create paid resources unintentionally.
