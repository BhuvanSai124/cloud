"""FastAPI backend for CloudPulse Monitoring & Alert Dashboard.

Ties together:
- Dual-mode data sources: SimulatedMetricSource & GcpMetricSource
- SQLite repository with migrations & time series aggregation
- Rule-based Alert Engine with deduplication, escalation, & recovery
- Full REST API complying with all project requirements
"""

from __future__ import annotations

import logging
import os
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import get_settings, Settings
from .schemas.metrics import (
    NormalizedMetric,
    ThresholdRule,
    ThresholdRuleCreate,
    ThresholdRuleUpdate,
    IncidentAcknowledgeRequest,
    IncidentResolveRequest,
    SettingsUpdate,
    GcpVerifyRequest,
    SimulationScenarioRequest,
    HistoricalGenerationRequest,
)
from .services.metric_source import MetricSource, SimulatedMetricSource, GcpMetricSource
from .services.alert_engine import AlertEngine
from .database.sqlite_repo import SQLiteRepository

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("cloudpulse.api")


def init_default_data(repo: SQLiteRepository, sim_source: SimulatedMetricSource, stored_source: str):
    """Seed initial services, rules, and historical samples if repository is empty."""
    apps = repo.list_applications()
    if not apps:
        logger.info("Prepopulating demo service inventory...")
        default_apps = [
            {"id": "app-01", "name": "API-Gateway", "environment": "prod", "resource_type": "cloud_run_revision", "resource_name": "us-central1/api-gw-001"},
            {"id": "app-02", "name": "Payment-Service", "environment": "prod", "resource_type": "cloud_run_revision", "resource_name": "us-central1/payment-002"},
            {"id": "app-03", "name": "Inventory-Service", "environment": "prod", "resource_type": "gce_instance", "resource_name": "zones/us-central1-a/instances/inv-prod-01"},
            {"id": "app-04", "name": "Notification-Worker", "environment": "staging", "resource_type": "cloud_run_revision", "resource_name": "us-central1/notif-stg-01"},
        ]
        for a in default_apps:
            repo.create_application(
                app_id=a["id"],
                name=a["name"],
                environment=a["environment"],
                resource_type=a["resource_type"],
                resource_name=a["resource_name"],
                data_source=stored_source,
            )

    # Prepopulate default rules independently if none exist
    rules = repo.list_rules()
    if not rules:
        logger.info("Prepopulating default alert rules...")
        rules_to_create = [
            {
                "id": "rule-cpu-app01",
                "name": "High CPU - API Gateway",
                "description": "Alert when API Gateway CPU utilization exceeds threshold",
                "application_id": "app-01",
                "metric": "cpu",
                "operator": ">",
                "threshold": 80.0,
                "warning": 80.0,
                "critical": 90.0,
                "direction": "above-is-worse",
                "unit": "%",
                "severity": "warning",
                "recovery_readings": 3,
                "cooldown_minutes": 10,
            },
            {
                "id": "rule-cpu-app02",
                "name": "Critical CPU - Payment Service",
                "description": "Alert when Payment Service CPU utilization is dangerously high",
                "application_id": "app-02",
                "metric": "cpu",
                "operator": ">",
                "threshold": 85.0,
                "warning": 80.0,
                "critical": 92.0,
                "direction": "above-is-worse",
                "unit": "%",
                "severity": "critical",
                "recovery_readings": 3,
                "cooldown_minutes": 10,
            },
            {
                "id": "rule-mem-app01",
                "name": "High Memory - API Gateway",
                "description": "Alert when memory usage approaches container limits",
                "application_id": "app-01",
                "metric": "memory",
                "operator": ">",
                "threshold": 80.0,
                "warning": 80.0,
                "critical": 90.0,
                "direction": "above-is-worse",
                "unit": "%",
                "severity": "warning",
                "recovery_readings": 3,
                "cooldown_minutes": 10,
            },
            {
                "id": "rule-lat-app01",
                "name": "Latency Spike - API Gateway",
                "description": "Alert when response latency exceeds acceptable SLO",
                "application_id": "app-01",
                "metric": "latency",
                "operator": ">",
                "threshold": 300.0,
                "warning": 300.0,
                "critical": 500.0,
                "direction": "above-is-worse",
                "unit": "ms",
                "severity": "warning",
                "recovery_readings": 3,
                "cooldown_minutes": 10,
            },
            {
                "id": "rule-err-app01",
                "name": "Elevated Error Rate - API Gateway",
                "description": "Alert when HTTP 5xx error rate rises",
                "application_id": "app-01",
                "metric": "error_rate",
                "operator": ">",
                "threshold": 2.0,
                "warning": 2.0,
                "critical": 5.0,
                "direction": "above-is-worse",
                "unit": "%",
                "severity": "critical",
                "recovery_readings": 3,
                "cooldown_minutes": 10,
            },
        ]
        for r in rules_to_create:
            repo.create_rule(**r)

    # Check if snapshots exist; if not, generate 6 hours of realistic historical samples
    existing_snaps = repo.list_snapshots(limit=5)
    if not existing_snaps:
        logger.info("Generating initial historical telemetry (6 hours)...")
        history_samples = sim_source.generate_history(hours=6, interval_minutes=5)
        for s in history_samples:
            repo.record_snapshot(s)
        logger.info(f"Recorded {len(history_samples)} initial historical snapshots.")


# -------------------------------------------------------------------------
# Lifespan: startup / shutdown
# -------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize components on startup, clean up on shutdown."""
    settings = get_settings()
    repo = app.state.repo
    sim_source = app.state.sim_source
    stored_source = app.state.active_source_type

    init_default_data(repo, sim_source, stored_source)
    yield
    repo.close()
    logger.info("CloudPulse backend shutdown complete.")


# -------------------------------------------------------------------------
# App Creation & Dependencies
# -------------------------------------------------------------------------

def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="CloudPulse API",
        description="Cloud Application Monitoring & Alert Dashboard - High-Performance Observability Engine",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Initialize state immediately so endpoints and TestClient work reliably
    repo = SQLiteRepository(db_path=getattr(settings, "DB_PATH", "cloudpulse.db"))
    stored_source = repo.get_setting("data_source", settings.DATA_SOURCE)
    stored_project = repo.get_setting("gcp_project_id", settings.GCP_PROJECT_ID)
    sim_source = SimulatedMetricSource()
    gcp_source = GcpMetricSource(project_id=stored_project)
    active_source: MetricSource = gcp_source if stored_source == "gcp" else sim_source
    alert_engine = AlertEngine(repository=repo)

    app.state.repo = repo
    app.state.sim_source = sim_source
    app.state.gcp_source = gcp_source
    app.state.metric_source = active_source
    app.state.alert_engine = alert_engine
    app.state.settings = settings
    app.state.active_source_type = stored_source

    # Prepopulate default services, rules, and history if empty
    init_default_data(repo, sim_source, stored_source)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Permits local dev and preview hosts
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def get_repo() -> SQLiteRepository:
        return app.state.repo

    def get_metric_source() -> MetricSource:
        return app.state.metric_source

    def get_alert_engine() -> AlertEngine:
        return app.state.alert_engine

    # -------------------------------------------------------------------------
    # 1. Health & System Status
    # -------------------------------------------------------------------------

    @app.get("/health", tags=["system"])
    @app.get("/api/health", tags=["system"])
    async def health_check():
        """Backend health check with source & database status."""
        repo = app.state.repo
        source = app.state.metric_source
        source_health = source.health_status()

        try:
            repo._get_conn()
            db_status = "healthy"
        except Exception as e:
            db_status = f"unhealthy: {e}"

        return {
            "status": "ok",
            "data_source": app.state.active_source_type,
            "source_health": source_health,
            "database": db_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # -------------------------------------------------------------------------
    # 2. Overview Endpoint
    # -------------------------------------------------------------------------

    @app.get("/api/overview", tags=["overview"])
    async def get_overview(
        range: str = Query("1h", description="Time range: 15m, 1h, 6h, 24h, 7d"),
        service_id: Optional[str] = Query(None, description="Optional service filter"),
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """Main dashboard overview payload containing KPIs, charts, and health distributions."""
        overview_data = repo.get_overview_data(time_range=range, service_id=service_id)
        overview_data["data_source"] = app.state.active_source_type
        overview_data["gcp_project_id"] = repo.get_setting("gcp_project_id", "")
        return overview_data

    # -------------------------------------------------------------------------
    # 3. Services / Applications Endpoints
    # -------------------------------------------------------------------------

    @app.get("/api/services", tags=["services"])
    @app.get("/api/apps", tags=["services"])
    async def list_services(repo: SQLiteRepository = Depends(get_repo)):
        """List all monitored services with live health badges and metrics."""
        apps = repo.list_applications()
        incidents = repo.list_incidents()
        active_incidents = [i for i in incidents if i["state"] in ("open", "firing", "acknowledged")]

        results = []
        for app_item in apps:
            app_id = app_item["id"]
            app_active = [i for i in active_incidents if i["application_id"] == app_id]

            if any(i["severity"] == "critical" for i in app_active):
                health = "critical"
            elif any(i["severity"] == "warning" for i in app_active):
                health = "degraded"
            else:
                health = "healthy"

            # Get latest snapshot for this app
            snaps = repo.list_snapshots(application_id=app_id, limit=6)
            latest_metrics = {s["metric"]: s["value"] for s in snaps}
            last_updated = snaps[0]["timestamp"] if snaps else app_item.get("updated_at")

            results.append({
                **app_item,
                "health_status": health,
                "active_incidents_count": len(app_active),
                "latest_metrics": latest_metrics,
                "last_metric_update": last_updated,
                "available_metric_categories": ["cpu", "memory", "latency", "request_count", "error_rate", "availability"],
            })

        return results

    @app.get("/api/services/{service_id}", tags=["services"])
    @app.get("/api/apps/{service_id}/summary", tags=["services"])
    async def get_service_details(service_id: str, repo: SQLiteRepository = Depends(get_repo)):
        """Get granular details, active alerts, and recent telemetry for a specific service."""
        app_item = repo.get_application(service_id)
        if not app_item:
            raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")

        snapshots = repo.list_snapshots(application_id=service_id, limit=100)
        open_incidents = repo.list_incidents(application_id=service_id, state="open")
        rules = repo.list_rules(application_id=service_id)

        return {
            "service": app_item,
            "application": app_item,
            "latest_metrics": snapshots[:10],
            "open_incidents": open_incidents,
            "rules": rules,
        }

    # -------------------------------------------------------------------------
    # 4. Metrics Endpoints
    # -------------------------------------------------------------------------

    @app.get("/api/metrics", tags=["metrics"])
    async def get_metrics(
        service_id: Optional[str] = Query(None, description="Optional service ID"),
        application_id: Optional[str] = Query(None, description="Alias for service_id"),
        metric: Optional[str] = Query(None, description="Metric type filter"),
        range: str = Query("1h", description="Time range"),
        limit: int = Query(200, ge=1, le=2000),
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """Query raw and filtered metric snapshots."""
        target_app = service_id or application_id
        snapshots = repo.list_snapshots(application_id=target_app, metric=metric, limit=limit)
        return {
            "metrics": snapshots,
            "count": len(snapshots),
            "data_source": app.state.active_source_type,
            "last_collection": snapshots[0]["timestamp"] if snapshots else datetime.now(timezone.utc).isoformat(),
        }

    @app.get("/api/apps/{app_id}", tags=["metrics"])
    async def get_app_metrics_legacy(app_id: str, repo: SQLiteRepository = Depends(get_repo)):
        """Legacy route for compatibility with earlier frontend versions."""
        target = None if app_id == "all" else app_id
        snapshots = repo.list_snapshots(application_id=target, limit=200)
        return {
            "metrics": snapshots,
            "last_collection": snapshots[0]["timestamp"] if snapshots else datetime.now(timezone.utc).isoformat(),
        }

    @app.post("/api/collect", tags=["collection"])
    @app.get("/api/collect", tags=["collection"])
    async def trigger_collection(
        repo: SQLiteRepository = Depends(get_repo),
        metric_source: MetricSource = Depends(get_metric_source),
        alert_engine: AlertEngine = Depends(get_alert_engine),
    ):
        """Perform a metric collection tick and evaluate alert rules."""
        start_time = datetime.now(timezone.utc)
        metrics = metric_source.get_metrics()

        # Persist metric snapshots
        for m in metrics:
            if m.value is not None:
                repo.record_snapshot(m)

        # Evaluate applicable rules
        rules = repo.list_rules_as_models()
        eval_results = []
        for m in metrics:
            matched_rules = [r for r in rules if r.enabled and (r.application_id in (m.application_id, "all")) and r.metric == m.metric]
            for r in matched_rules:
                res = alert_engine.evaluate_metric(m, r)
                if res:
                    eval_results.append(res)

        duration = (datetime.now(timezone.utc) - start_time).total_seconds()
        return {
            "status": "success",
            "timestamp": start_time.isoformat(),
            "data_source": app.state.active_source_type,
            "metrics_collected": len(metrics),
            "rules_evaluated": len(eval_results),
            "events_triggered": eval_results,
            "duration_seconds": round(duration, 3),
        }

    # -------------------------------------------------------------------------
    # 5. Alert Rules Endpoints
    # -------------------------------------------------------------------------

    @app.get("/api/alerts/rules", tags=["alert-rules"])
    @app.get("/api/thresholds", tags=["alert-rules"])
    async def list_alert_rules(
        application_id: Optional[str] = None,
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """List all configured alert rules."""
        return repo.list_rules(application_id=application_id)

    @app.post("/api/alerts/rules", tags=["alert-rules"], status_code=status.HTTP_201_CREATED)
    async def create_alert_rule(
        payload: ThresholdRuleCreate,
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """Create a new threshold / alert rule."""
        rule_dict = payload.model_dump()
        created = repo.create_rule(**rule_dict)
        return created

    @app.patch("/api/alerts/rules/{rule_id}", tags=["alert-rules"])
    @app.put("/api/thresholds/{rule_id}", tags=["alert-rules"])
    async def update_alert_rule(
        rule_id: str,
        updates: dict,
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """Update an existing alert rule."""
        rule = repo.update_rule(rule_id, updates)
        if not rule:
            raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")
        return rule

    @app.delete("/api/alerts/rules/{rule_id}", tags=["alert-rules"])
    async def delete_alert_rule(rule_id: str, repo: SQLiteRepository = Depends(get_repo)):
        """Delete an alert rule."""
        success = repo.delete_rule(rule_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")
        return {"status": "deleted", "rule_id": rule_id}

    # -------------------------------------------------------------------------
    # 6. Incidents & Alerts Management Endpoints
    # -------------------------------------------------------------------------

    @app.get("/api/incidents", tags=["incidents"])
    @app.get("/api/alerts", tags=["incidents"])
    @app.get("/api/alerts/history", tags=["incidents"])
    async def list_incidents(
        severity: Optional[str] = Query(None, description="info, warning, critical"),
        state: Optional[str] = Query(None, description="open, firing, acknowledged, resolved"),
        application_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = Query(100, ge=1, le=500),
        offset: int = Query(0, ge=0),
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """List persistent incidents with filtering, search, and pagination."""
        return repo.list_incidents(
            severity=severity,
            state=state,
            application_id=application_id,
            search=search,
            limit=limit,
            offset=offset,
        )

    @app.get("/api/incidents/{incident_id}", tags=["incidents"])
    @app.get("/api/alerts/{incident_id}", tags=["incidents"])
    async def get_incident(incident_id: str, repo: SQLiteRepository = Depends(get_repo)):
        """Get incident details with audit timeline events."""
        incident = repo.get_incident(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
        events = repo.get_alert_events(incident_id)
        incident["events"] = events
        return incident

    @app.post("/api/incidents/{incident_id}/acknowledge", tags=["incidents"])
    @app.post("/api/alerts/{incident_id}/acknowledge", tags=["incidents"])
    async def acknowledge_incident(
        incident_id: str,
        payload: IncidentAcknowledgeRequest = IncidentAcknowledgeRequest(),
        alert_engine: AlertEngine = Depends(get_alert_engine),
    ):
        """Acknowledge an incident and record the event."""
        res = alert_engine.acknowledge_incident(incident_id, actor=payload.actor or "engineer@cloudpulse.io", note=payload.note)
        if not res:
            raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
        return res

    @app.post("/api/incidents/{incident_id}/resolve", tags=["incidents"])
    async def resolve_incident(
        incident_id: str,
        payload: IncidentResolveRequest = IncidentResolveRequest(),
        alert_engine: AlertEngine = Depends(get_alert_engine),
    ):
        """Manually resolve an incident and record duration & reason."""
        res = alert_engine.resolve_incident(incident_id, actor=payload.actor or "engineer@cloudpulse.io", reason=payload.reason)
        if not res:
            raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
        return res

    # -------------------------------------------------------------------------
    # 7. Settings Endpoints
    # -------------------------------------------------------------------------

    @app.get("/api/settings", tags=["settings"])
    @app.get("/api/config", tags=["settings"])
    async def get_app_settings(repo: SQLiteRepository = Depends(get_repo)):
        """Return system configuration and current mode."""
        settings = app.state.settings
        current_source = app.state.active_source_type
        gcp_project = repo.get_setting("gcp_project_id", settings.GCP_PROJECT_ID)

        return {
            "data_source": current_source,
            "project_id": gcp_project,
            "gcp_project_id": gcp_project,
            "collection_interval_seconds": int(repo.get_setting("collection_interval_seconds", str(settings.COLLECTION_INTERVAL_SECONDS))),
            "notification_cooldown_minutes": int(repo.get_setting("notification_cooldown_minutes", str(settings.NOTIFICATION_COOLDOWN_MINUTES))),
            "recovery_readings_count": int(repo.get_setting("recovery_readings_count", str(settings.RECOVERY_READINGS_COUNT))),
            "frontend_origin": settings.FRONTEND_ORIGIN,
            "demo_thresholds": {
                "cpu_warning": settings.DEMO_CPU_WARNING,
                "cpu_critical": settings.DEMO_CRITICAL,
                "memory_warning": settings.DEMO_MEMORY_WARNING,
                "memory_critical": settings.DEMO_MEMORY_CRITICAL,
            },
        }

    @app.patch("/api/settings", tags=["settings"])
    async def update_settings(
        payload: SettingsUpdate,
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """Update system settings (such as switching between simulation and GCP)."""
        if payload.data_source is not None:
            new_source = payload.data_source
            repo.set_setting("data_source", new_source)
            app.state.active_source_type = new_source
            if new_source == "gcp":
                app.state.metric_source = app.state.gcp_source
            else:
                app.state.metric_source = app.state.sim_source
            logger.info(f"Switched data_source to: {new_source}")

        if payload.gcp_project_id is not None:
            repo.set_setting("gcp_project_id", payload.gcp_project_id)
            app.state.gcp_source.project_id = payload.gcp_project_id

        if payload.collection_interval_seconds is not None:
            repo.set_setting("collection_interval_seconds", str(payload.collection_interval_seconds))

        if payload.notification_cooldown_minutes is not None:
            repo.set_setting("notification_cooldown_minutes", str(payload.notification_cooldown_minutes))

        if payload.recovery_readings_count is not None:
            repo.set_setting("recovery_readings_count", str(payload.recovery_readings_count))

        return await get_app_settings(repo=repo)

    # -------------------------------------------------------------------------
    # 8. GCP Cloud Connections Endpoints
    # -------------------------------------------------------------------------

    @app.post("/api/cloud/gcp/verify", tags=["gcp"])
    async def verify_gcp_connection(
        payload: GcpVerifyRequest = GcpVerifyRequest(),
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """Verify GCP credentials and Cloud Monitoring connectivity."""
        project = payload.project_id or repo.get_setting("gcp_project_id", "")
        gcp_source: GcpMetricSource = app.state.gcp_source
        result = gcp_source.verify_connection(project_id=project)
        return result

    @app.get("/api/cloud/gcp/metrics", tags=["gcp"])
    async def get_gcp_metrics():
        """Retrieve actual Google Cloud Monitoring metrics if connected."""
        gcp_source: GcpMetricSource = app.state.gcp_source
        metrics = gcp_source.get_metrics()
        return {
            "metrics": metrics,
            "project_id": gcp_source.project_id,
            "connected": gcp_source._credentials_valid,
        }

    # -------------------------------------------------------------------------
    # 9. Simulation Controls & Scenarios Endpoints
    # -------------------------------------------------------------------------

    @app.post("/api/simulation/start", tags=["simulation"])
    async def simulation_start():
        """Resume simulation engine."""
        sim: SimulatedMetricSource = app.state.sim_source
        sim.is_paused = False
        return {"status": "running", "speed": sim.speed, "active_scenario": sim.active_scenario}

    @app.post("/api/simulation/pause", tags=["simulation"])
    async def simulation_pause():
        """Pause simulation engine."""
        sim: SimulatedMetricSource = app.state.sim_source
        sim.is_paused = True
        return {"status": "paused", "speed": sim.speed, "active_scenario": sim.active_scenario}

    @app.post("/api/simulation/scenario", tags=["simulation"])
    @app.post("/api/demo/scenarios/{scenario}", tags=["simulation"])
    async def trigger_simulation_scenario(
        scenario: str = "cpu_spike",
        target_app: Optional[str] = "app-01",
        repo: SQLiteRepository = Depends(get_repo),
        alert_engine: AlertEngine = Depends(get_alert_engine),
    ):
        """Trigger an anomaly scenario (e.g., cpu_spike, memory_spike, slow_response, http_5xx, recovery)."""
        sim: SimulatedMetricSource = app.state.sim_source
        sim.set_scenario(scenario, app_id=target_app)

        # Immediately generate one sample and evaluate so the result is instant in the UI
        now = datetime.now(timezone.utc)
        target_spec = next((a for a in sim.applications if a["id"] == target_app), sim.applications[0])
        samples = sim.generate_sample_for_time(target_spec, now)

        events = []
        rules = repo.list_rules_as_models()
        for s in samples:
            repo.record_snapshot(s)
            matching = [r for r in rules if r.enabled and (r.application_id in (s.application_id, "all")) and r.metric == s.metric]
            for r in matching:
                ev = alert_engine.evaluate_metric(s, r)
                if ev:
                    events.append(ev)

        return {
            "status": "scenario_active",
            "scenario": scenario,
            "target_application": target_app,
            "metrics_generated": len(samples),
            "events_triggered": events,
        }

    @app.post("/api/simulation/reset", tags=["simulation"])
    @app.post("/api/demo/reset", tags=["simulation"])
    async def reset_simulation(
        repo: SQLiteRepository = Depends(get_repo),
        alert_engine: AlertEngine = Depends(get_alert_engine),
    ):
        """Reset simulation to healthy baseline and resolve active demo incidents."""
        sim: SimulatedMetricSource = app.state.sim_source
        sim.reset_scenario()

        # Resolve any open incidents
        open_incidents = repo.list_incidents(state="open") + repo.list_incidents(state="acknowledged")
        for inc in open_incidents:
            alert_engine.resolve_incident(inc["id"], actor="demo_reset", reason="Demo reset to healthy baseline")

        # Emit healthy metric samples
        metrics = sim.get_metrics()
        for m in metrics:
            repo.record_snapshot(m)

        return {"status": "reset_success", "active_scenario": "healthy", "resolved_incidents": len(open_incidents)}

    @app.post("/api/simulation/generate-history", tags=["simulation"])
    async def generate_history(
        payload: HistoricalGenerationRequest = HistoricalGenerationRequest(),
        repo: SQLiteRepository = Depends(get_repo),
    ):
        """Generate N hours of historical telemetry for charts and viva demonstration."""
        sim: SimulatedMetricSource = app.state.sim_source
        samples = sim.generate_history(hours=payload.hours, interval_minutes=payload.interval_minutes)
        for s in samples:
            repo.record_snapshot(s)
        return {
            "status": "generated",
            "hours": payload.hours,
            "samples_created": len(samples),
        }

    # -------------------------------------------------------------------------
    # 10. Guided Incident Drill Endpoints (Viva Demonstration)
    # -------------------------------------------------------------------------

    @app.post("/api/demo/drill/start", tags=["demo-lab"])
    async def drill_start(repo: SQLiteRepository = Depends(get_repo)):
        """Start a guided step-by-step incident drill."""
        sim: SimulatedMetricSource = app.state.sim_source
        sim.reset_scenario()
        return {"status": "drill_started", "step": 1, "description": "System in healthy baseline state."}

    @app.post("/api/demo/drill/step", tags=["demo-lab"])
    async def drill_step(
        step: int = Query(..., ge=1, le=8),
        repo: SQLiteRepository = Depends(get_repo),
        alert_engine: AlertEngine = Depends(get_alert_engine),
    ):
        """Advance guided incident drill to step 1 through 8."""
        sim: SimulatedMetricSource = app.state.sim_source
        now = datetime.now(timezone.utc)
        target_app = "app-01"

        if step == 1:
            sim.reset_scenario()
            return {"step": 1, "title": "Healthy Baseline", "status": "All systems nominal."}

        elif step == 2:
            # Warning breach
            metric = NormalizedMetric(
                application_id=target_app,
                metric="cpu",
                value=84.5,
                unit="%",
                timestamp=now,
                source="simulated",
                resource_name=target_app,
            )
            repo.record_snapshot(metric)
            rule = repo.get_rule_by_id("rule-cpu-app01")
            res = alert_engine.evaluate_metric(metric, rule) if rule else None
            return {"step": 2, "title": "Warning Threshold Breach", "action": res}

        elif step == 3:
            # Escalation to critical
            metric = NormalizedMetric(
                application_id=target_app,
                metric="cpu",
                value=94.8,
                unit="%",
                timestamp=now,
                source="simulated",
                resource_name=target_app,
            )
            repo.record_snapshot(metric)
            rule = repo.get_rule_by_id("rule-cpu-app01")
            res = alert_engine.evaluate_metric(metric, rule) if rule else None
            return {"step": 3, "title": "Escalation to Critical", "action": res}

        elif step == 4:
            # Acknowledge
            incidents = repo.list_incidents(application_id=target_app, state="open")
            if incidents:
                ack = alert_engine.acknowledge_incident(incidents[0]["id"], actor="oncall_sre@cloudpulse.io")
                return {"step": 4, "title": "Incident Acknowledged", "incident": ack}
            return {"step": 4, "title": "No open incident to acknowledge"}

        elif step == 5:
            # Recovery reading #1
            metric = NormalizedMetric(
                application_id=target_app,
                metric="cpu",
                value=52.0,
                unit="%",
                timestamp=now,
                source="simulated",
                resource_name=target_app,
            )
            repo.record_snapshot(metric)
            rule = repo.get_rule_by_id("rule-cpu-app01")
            res = alert_engine.evaluate_metric(metric, rule) if rule else None
            return {"step": 5, "title": "First Healthy Reading", "result": res}

        elif step == 6:
            # Recovery reading #2 & #3 (triggers resolution)
            rule = repo.get_rule_by_id("rule-cpu-app01")
            results = []
            for i in range(2):
                metric = NormalizedMetric(
                    application_id=target_app,
                    metric="cpu",
                    value=48.0 - i * 2,
                    unit="%",
                    timestamp=now,
                    source="simulated",
                    resource_name=target_app,
                )
                repo.record_snapshot(metric)
                if rule:
                    res = alert_engine.evaluate_metric(metric, rule)
                    results.append(res)
            return {"step": 6, "title": "Recovery Hysteresis Satisfied", "results": results}

        elif step == 7:
            # Summary of timeline
            incidents = repo.list_incidents(application_id=target_app, limit=1)
            inc = incidents[0] if incidents else None
            events = repo.get_alert_events(inc["id"]) if inc else []
            return {"step": 7, "title": "Incident Resolved & Audited", "incident": inc, "timeline_events": events}

        else:
            return {"step": step, "title": "Drill Complete"}

    # -------------------------------------------------------------------------
    # Exception handling
    # -------------------------------------------------------------------------

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request, exc):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "path": request.url.path, "timestamp": datetime.now(timezone.utc).isoformat()},
        )

    return app


app = create_app()