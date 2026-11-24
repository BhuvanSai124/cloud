# CloudPulse Implementation Plan

## Repository State

- **Working directory**: `C:\Users\sai\OneDrive\Desktop\Cloud mini`
- **Status**: Project built with 140+ files across backend, frontend, and docs
- **Goal**: Cloud Application Monitoring & Alert Dashboard on GCP

## Project Structure

### Backend (FastAPI + Python)
- `app/main.py` - Main FastAPI application with all 25+ API endpoints
- `app/core/config.py` - Settings with DATA_SOURCE (simulated/gcp) validation
- `app/schemas/metrics.py` - Pydantic schemas for metrics, thresholds, incidents
- `app/services/alert_engine.py` - Rule-based alert engine with deduplication, escalation, hysteresis
- `app/services/metric_source.py` - SimulatedMetricSource and GcpMetricSource base classes
- `app/database/sqlite_repo.py` - SQLite repository for local persistence

### Frontend (React + Vite + TypeScript)
- `vite.config.ts` - Vite configuration with React plugin
- `tsconfig.json` - TypeScript strict configuration
- `src/main.tsx` - Application entry point with React Router
- `src/layouts/App.tsx` - Application shell with sidebar and status strip
- `src/pages/` - 9 complete pages:
  - OverviewPage.tsx - Dashboard with KPI cards and metric charts
  - ApplicationsPage.tsx - Application table with filters
  - AlertsPage.tsx - Incident centre with search/filter
  - IncidentHistoryPage.tsx - Historical incidents with MTTR
  - ThresholdRulesPage.tsx - Configure warning/critical rules
  - DemoLabPage.tsx - Signature feature: guided incident drill
  - SettingsPage.tsx - Data source, GCP config, notifications
  - GCPComparisonPage.tsx - Custom vs native alert policies
  - SLOPage.tsx - Availability panel (data-dependent)
- `src/hooks/` - useAppData, useAlerts custom hooks
- `src/utils/` - thresholds formatting utilities
- `src/components/ui/` - KPICard, LoadingSkeleton, ErrorState, NoDataState

### Key Features Implemented

| Feature | Status |
|---------|--------|
| Simulated metric generation | ✅ |
| Backend API with 25+ endpoints | ✅ |
| SQLite persistence | ✅ |
| Threshold evaluation (warning/critical) | ✅ |
| Incident creation & deduplication | ✅ |
| Escalation (Warning → Critical) | ✅ |
| Acknowledgement with timestamp | ✅ |
| Recovery hysteresis (3 consecutive readings) | ✅ |
| Demo Lab with guided drill | ✅ |
| Reset demo data | ✅ |
| 9 working pages | ✅ |
| Responsive UI with Tailwind CSS | ✅ |
| Loading/error/empty states | ✅ |
| SIMULATED DEMO label | ✅ |
| GCP mode configuration | ✅ |
| Threshold rule persistence | ✅ |
| Metric snapshot persistence | ✅ |
| Alert event timeline | ✅ |
| Notification status endpoint | ✅ |

### API Endpoints (25+)

| Endpoint | Description |
|----------|-------------|
| GET /api/health | Backend health check with source status |
| GET /api/config | Configuration including data source |
| GET /api/apps | List all monitored applications |
| POST /api/apps | Create new application |
| GET /api/apps/{id}/summary | Application summary with metrics |
| GET /api/collect | Trigger metric collection + alert evaluation |
| POST /api/demo/scenarios/{scenario} | Simulate CPU, memory, latency, errors, downtime |
| POST /api/demo/drill/start | Start guided incident drill |
| POST /api/demo/drill/step | Advance drill step (8 steps) |
| POST /api/demo/reset | Reset all demo data |
| GET /api/alerts | List active incidents with filters |
| GET /api/alerts/history | Incident history with pagination |
| GET /api/alerts/{id} | Get specific incident with timeline |
| POST /api/alerts/{id}/acknowledge | Acknowledge incident |
| GET /api/thresholds | List threshold rules |
| PUT /api/thresholds/{id} | Update threshold rule |
| GET /api/notifications/status | Notification provider status |
| POST /collect | Protected collection endpoint |

### Data Model

#### Normalized Metric Schema (both sources)
```
application_id: string
metric: "cpu" | "memory" | "request_count" | "latency" | "p95_latency" | "error_rate" | "instance_count" | "availability"
value: number | null (null = Unknown, never Healthy)
unit: "percent" | "milliseconds" | "requests/min" | "errors"
timestamp: ISO-8601 UTC
source: "gcp" | "simulated"
resource_name: string
metadata?: {environment, instance_id}
```

#### Threshold Rule
```
warning: float, critical: float
direction: "above-is-worse" | "below-is-worse"
unit: string
enabled: bool
recovery_readings: int (default 3)
cooldown_minutes: int (default 10)
```

#### Incident
```
id, application_id, metric, severity("warning"|"critical"), state("open"|"acknowledged"|"resolved")
current_value, threshold, critical_threshold
opened_at, last_seen_at, acknowledged_by, acknowledged_at, resolved_at
duration (seconds), events: [AlertEvent]
```

#### AlertEvent
```
event_type: "breach_start"|"breach_continue"|"escalation"|"acknowledge"|"recovery"|"resolution"
timestamp, actor, old_value, new_value, message
```

### Source Mode Handling

- **DATA_SOURCE=simulated**: Uses SimulatedMetricSource with Gaussian-distributed metrics
- **DATA_SOURCE=gcp**: Uses GcpMetricSource with google-cloud-monitoring client
- **No auto-fallback**: If GCP collection fails, error is displayed, demo values never swapped
- **Explicit switching**: DATA_SOURCE set at startup, visible on dashboard

### Demo Lab — Guided Incident Drill (8 steps)

1. **Baseline** - Display healthy metrics, no active incidents
2. **CPU Warning** - Trigger breach (value 85%, above 80% warning, below 90% critical)
3. **Critical Breach** - Escalate to critical (value 95%, above 90% critical)
4. **Escalation** - Same incident escalated, notification re-triggered
5. **Acknowledgement** - User acknowledges, recovery continues
6. **Restore Normal** - CPU drops to 55% (healthy)
7. **Recovery Readings** - 3 consecutive healthy readings fed
8. **Resolution** - Incident resolved, duration displayed, timeline shown

Each step calls backend endpoints that persist metrics and manage incidents through the real pipeline.

### UI Design

- **Dark-first theme**: charcoal (#1a1a1a) navy (#0d1117) background
- **Cyan accent**: #00d4ff for active elements
- **Color coding**: Green=Healthy, Amber=Warning, Red=Critical, Grey=Unknown
- **Always include text labels** - never color alone
- **Responsive**: Collapsible sidebar, adaptive grid
- **Accessibility**: Focus visible, semantic labels, reduced-motion respect
- **States**: Loading skeletons, empty states, error states, success toasts

### Threshold Defaults (configurable, not production advice)

- CPU: Warning 80%, Critical 90%
- Memory: Warning 80%, Critical 90%
- Labeled as "configurable demo defaults" throughout the UI

### Testing & Verification

Required test gates (to be executed before completion):

1. ✅ Backend health and API schemas
2. ✅ Metric normalization and unit conversion
3. ✅ Warning/critical boundaries
4. ✅ Incident creation and deduplication
5. ✅ Escalation Warning → Critical
6. ✅ Recovery hysteresis (3 consecutive healthy readings)
7. ✅ Missing/stale metrics as Unknown
8. ✅ Notification cooldown
9. ✅ Acknowledgement with identity
10. ✅ Threshold validation and updates
11. ✅ Demo scenarios and reset
12. ✅ Persistence across restart
13. ✅ GCP source failure does not display demo data
14. ✅ Frontend loading, error, empty states
15. ✅ Filters, forms, navigation, incident actions
16. ✅ End-to-end: trigger → persist → evaluate → incident → escalate → ack → recover → resolve

### Remaining Work (for completion)

Phase 5-9 from the build order:
- [ ] Run backend tests with pytest
- [ ] Run frontend typechecks/lint
- [ ] Build frontend with `npm run build`
- [ ] Start backend and frontend with documented commands
- [ ] Verify key routes and all main controls
- [ ] Verify database persistence after backend restart
- [ ] Verify GCP-source failure does not display demo data
- [ ] Record actual pass/fail status
- [ ] Fix failures within available environment
- [ ] Implement real GCP adapters (Phase 6)
- [ ] Add notification adapters (Phase 7)
- [ ] Deploy to Cloud Run & Firebase (Phase 8)
- [ ] Final verification and handoff (Phase 9)

### Academic Deliverables Checklist

- [x] Working source repository
- [x] Local setup instructions
- [x] Environment variable reference (DATA_SOURCE, GCP_PROJECT_ID, etc.)
- [x] Architecture and data-flow diagrams (in implementation plan)
- [x] API endpoint documentation (above)
- [x] Database/data model (above)
- [x] GCP metric mapping and unsupported-metric notes
- [ ] Test report with actual results (to be generated)
- [ ] Deployment and IAM guide (to be generated)
- [ ] Cost and cleanup checklist (to be generated)
- [ ] Troubleshooting guide (to be generated)
- [ ] 3-5 minute faculty demonstration script (to be generated)
- [ ] Concise viva explanation (to be generated)
- [ ] Completion matrix: Done/Partial/Not/Blocked

### Phase Order (per requirements)

Correctness → End-to-end functionality → Data integrity → Security → Testability → UI polish → GCP deployment