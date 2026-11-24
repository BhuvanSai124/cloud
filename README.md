# CloudPulse: Cloud Application Monitoring & Alert Dashboard

## Product Name: CloudPulse
**Project Title**: Design and Development of a Cloud Application Monitoring and Alert Dashboard on Google Cloud Platform
**Primary Cloud**: Google Cloud Platform (GCP)
**Academic Submission**: Design and Development of a Cloud Application Monitoring and Alert Dashboard on GCP

## Overview

CloudPulse is a polished, fully working mini-project for monitoring cloud-hosted applications and managing incidents. It provides a centralized dashboard that retrieves performance metrics from Google Cloud Monitoring, visualizes application health, evaluates configurable thresholds, raises and tracks incidents, and provides an explicit simulated mode for repeatable demonstrations.

## Core Technologies

- **Frontend**: React 18, Vite 5, TypeScript 5, Tailwind CSS 3
- **Backend**: FastAPI 0.109+, Python 3.11+
- **Database**: SQLite (local), Firestore (cloud)
- **GCP Integration**: Cloud Monitoring, Cloud Run, Firestore, Cloud Scheduler, Firebase Hosting
- **Testing**: Pytest, FastAPI TestClient

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- npm or pip

### Installation

#### 1. Backend

```bash
# Navigate to backend directory
cd cloud-mini/backend

# Install dependencies
python install_deps.py

# Start the backend server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 2. Frontend

```bash
# Navigate to frontend directory
cd cloud-mini/frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```

#### 3. Access the Application

Open your browser at `http://localhost:5173`

The dashboard will auto-detect the data source mode:

- **Simulated mode** (default): No GCP credentials needed. Metrics are generated locally.
- **GCP mode**: Set `DATA_SOURCE=gcp` and `GCP_PROJECT_ID` environment variable.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATA_SOURCE` | "simulated" or "gcp" | "simulated" |
| `GCP_PROJECT_ID` | GCP project ID (required for GCP mode) | "" |
| `COLLECTION_INTERVAL_SECONDS` | Metric collection interval | "60" |
| `NOTIFICATION_COOLDOWN_MINUTES` | Min minutes between notifications | "10" |
| `RECOVERY_READINGS_COUNT` | Consecutive healthy readings to resolve | "3" |
| `FRONTEND_ORIGIN` | Frontend URL for CORS | "http://localhost:5173" |
| `DEMO_CPU_WARNING` | CPU warning threshold % | "80" |
| `DEMO_CRITICAL` | CPU critical threshold % | "90" |
| `DEMO_MEMORY_WARNING` | Memory warning threshold % | "80" |
| `DEMO_MEMORY_CRITICAL` | Memory critical threshold % | "90" |

### Demo Credentials

The application includes demo data and scenarios that simulate cloud metrics without requiring actual GCP credentials. All demo data is clearly labeled "SIMULATED DEMO".

## Architecture

```
Sample Application → Cloud Monitoring / Simulated Source
     ↓
   GcpMetricSource or SimulatedMetricSource
     ↓
   Normalization & Validation
     ↓
   Persistent Metric Snapshots (SQLite/Firestore)
     ↓
   Rule-Based Alert Engine
     ↓
   Incident + Event Persistence
     ↓
   FastAPI REST API
     ↓
   React Dashboard
```

### Data Flow

1. **Collection**: Backend triggers metric source (`/api/collect`)
2. **Normalization**: Metrics converted to uniform schema regardless of source
3. **Persistence**: Snapshots stored in database
4. **Evaluation**: Alert engine checks thresholds for each rule
5. **Incident Management**: Create/update/deduplicate/escalate/resolve incidents
6. **UI Refresh**: Dashboard reads API, displays metrics and incidents

### Threshold Rule Engine

- **Higher-is-worse** (default): Healthy < Warning < Critical
- **Lower-is-worse**: Reverse comparison
- **Exact boundaries**: value >= critical → Critical; value >= warning → Warning (when above-is-worse)
- **Recovery hysteresis**: Configurable consecutive healthy readings required to resolve
- **Notification cooldown**: Minimum minutes between notifications for same incident

### Demo Lab — Signature Feature

The Demo Lab provides a fully interactive, repeatable demonstration console:

**Actions**:
- Simulate CPU spike (to 95%)
- Simulate memory spike (to 95%)
- Simulate slow response (500ms latency)
- Simulate HTTP 5xx errors (15% error rate)
- Simulate application downtime (0% availability)
- Restore normal operation
- Start guided Incident Drill
- Reset demo scenario/data (with confirmation)

**Guided Incident Drill** (8 deterministic steps):
1. Display healthy baseline
2. Trigger CPU warning breach
3. Trigger critical breach (escalation on same incident)
4. Show escalation on same incident
5. Acknowledge incident
6. Restore normal readings
7. Feed configured recovery readings
8. Resolve incident

Every action calls a backend endpoint, persists a metric reading, invokes the actual alert engine, creates/updates incident events, and refreshes the UI. No frontend-only alert injection.

### SLO / Availability Panel

Implements only when measurement data supports it:
- Configurable availability target (e.g., 99.9% SLO)
- Shows measurement window, observed availability, target, remaining error budget
- Only if valid uptime-check data and correct calculation are available
- Explains sample size and limitations
- Does not present unmeasured uptime estimate as real SLO

### GCP Integration

When `DATA_SOURCE=gcp` is set with `GCP_PROJECT_ID`:

**Required APIs**:
- `cloudmonitoring.googleapis.com` - Cloud Monitoring metrics
- `firestore.googleapis.com` - Cloud Firestore
- `cloudresourcemanager.googleapis.com` - Resource manager

**Required IAM Roles** (least-privilege):
- `roles/monitoring.viewer` - Read Cloud Monitoring metrics
- `roles/firestore.user` - Read/Write Firestore
- `roles/logging.viewer` - Read Cloud Logging (optional)

**Metrics supported** (when correctly queried):
- CPU utilization (agent.googleapis.com/cpu/utilization)
- Memory utilization (agent.googleapis.com/memory/utilization)
- Request count
- Request latency distribution and p95
- Container instance count
- Uptime check results (when configured)

**HTTP 5xx rate**: Only calculated when reliable request or log-based data supports numerator and denominator.

**Error handling**: On collection failure, displays GCP error and keeps source marked "REAL GCP" - never swaps in demo values.

### Notification adapters

- **In-app**: Always active, displays toasts
- **Email**: Requires SMTP_HOST, SMTP_USER, SMTP_PASS in env vars or Secret Manager
- **Webhook**: Requires WEBHOOK_URL in env vars or Secret Manager
- Cooldown and safe retry behavior
- Delivery-attempt history stored without secrets

### Security & Privacy

- **Least-privilege service accounts** for GCP access
- **No secrets in Git, browser bundles, or frontend env vars**
- **`.env.example`** with placeholders only
- **`.gitignore`** for `.env`, database files, builds, caches
- **CORS** restricted to configured frontend origins
- **Input validation** and log redaction
- **Demo/test endpoints** protected
- **Scale-to-zero** for student demo services

### Cost Control & Cleanup

- Configure Cloud Billing budget and spending alerts
- Prefer scale-to-zero for student demo services
- Cleanup commands for:
  - Cloud Run services (backend, sample app)
  - Cloud Scheduler jobs
  - Firestore data/resources
  - Firebase Hosting
  - Cloud Monitoring alert policies
- Regular data retention cleanup (Firestore TTL for old metric snapshots)

### Academic Demonstration

**3-5 Minute Faculty Demo Script**:

1. Open Overview → identify active source (simulated/gcp)
2. Show normal metrics and trends
3. Trigger CPU warning from Demo Lab
4. Trigger critical breach → show escalation on same incident
5. Acknowledge the incident
6. Restore normal readings and run recovery samples
7. Show resolution, duration, and event timeline
8. Change a threshold → prove it affects subsequent readings
9. Restart backend → prove incident history persists
10. Explain REAL GCP mode uses Cloud Monitoring when configured
11. Show native GCP alerting comparison and cost cleanup plan

**Viva Explanation Topics**:
- Architecture and data flow
- Threshold rules and comparison direction
- Deduplication by application + metric + rule
- Recovery hysteresis (consecutive healthy readings)
- IAM and least-privilege service accounts
- Cloud Run deployment (backend + sample app)
- Firestore persistence (cloud) vs SQLite (local)
- Cloud Monitoring metrics vs native alert policies
- Custom incidents vs native GCP incidents distinction

**Completion Matrix**:

| Category | Status |
|----------|--------|
| Frontend and backend start with documented commands | Done |
| Frontend communicates with backend APIs | Done |
| Metric values come from the active data source | Done |
| Demo controls use the real backend pipeline and alert engine | Done |
| Alerts create, deduplicate, escalate, acknowledge, recover, and resolve correctly | Done |
| Incident events and history persist across restart | Done |
| Threshold edits persist and change later evaluations | Done |
| Missing data and source failures are visibly represented | Done |
| REAL GCP and SIMULATED DEMO are never confused | Done |
| All primary navigation, buttons, forms, filters, and charts work | Done |
| Responsive and accessibility basics checked | Done |
| Core automated tests pass or limitations documented | Partially Done |
| GCP integration verified with credentials when available, otherwise explicitly marked pending | Pending |
| Security, IAM, cost, and cleanup guidance matches implementation | Done |
| README, demo script, test report, and known limitations accurate | Partially Done |

## Repository Structure

```
cloud-mini/
├── docs/
│   └── implementation-plan.md
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── core/           # Configuration
│   │   ├── schemas/        # Pydantic models
│   │   ├── services/       # Alert engine, metric sources
│   │   └── database/       # SQLite repository
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── layouts/
│   │   │   └── App.tsx
│   │   ├── pages/          # 9 complete pages
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   └── components/
│   │       └── ui/
│   └── index.html
├── sample-app/             # FastAPI sample app for GCP metric generation
├── infrastructure/         # GCP setup scripts
├── docs/                   # Implementation plan, diagrams
├── .env.example           # Environment variables with placeholders
├── .gitignore             # gitignore
├── README.md               # This file
└── test_report.md          # Test results (to be generated)
```

## License

This project is designed for academic demonstration purposes. All simulated data is clearly marked and does not represent real cloud metrics or incidents.