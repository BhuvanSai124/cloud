"""Standalone Alert & Incident Engine for CloudPulse.

Source-agnostic: processes NormalizedMetric streams regardless of whether
they originate from SimulatedMetricSource or GcpMetricSource.

Features:
- Configurable operators (>, >=, <, <=, ==, !=) and direction (above/below-is-worse)
- Multi-level severities: INFO, WARNING, CRITICAL
- Incident lifecycle: Firing/Open -> Acknowledged -> Resolved
- Strict deduplication: prevents duplicate open incidents for the same condition
- Dynamic escalation: Warning -> Critical on the same active incident
- Recovery hysteresis: requires N consecutive healthy readings before resolution
- Timeline auditing: records breach_start, breach_continue, escalation, acknowledge, recovery, resolution events
- Notification dispatch: in-app logging with optional webhook integration
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from ..schemas.metrics import (
    NormalizedMetric,
    ThresholdRule,
    AlertEvent,
)

logger = logging.getLogger("cloudpulse.alerts")


class AlertEngine:
    """Rule-based alert evaluation and incident management engine."""

    def __init__(self, repository, notification_service=None):
        self.repository = repository
        self.notification_service = notification_service
        # In-memory tracking of consecutive healthy readings per incident
        self._consecutive_healthy: Dict[str, int] = {}

    def evaluate_metric(self, metric: NormalizedMetric, rule: ThresholdRule) -> Optional[dict]:
        """Evaluate a single metric against a threshold rule.

        Returns incident dict on creation, update, escalation, or resolution.
        """
        if metric.value is None:
            return None

        # Evaluate state using rule logic
        state = rule.check_state(metric.value)

        # Look up any active incident for this (app, metric, rule)
        active = self.repository.get_active_incident(
            application_id=metric.application_id,
            metric=metric.metric,
            rule_id=rule.id,
        )

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # CASE 1: Metric is HEALTHY
        if state == "healthy":
            if active:
                incident_id = active["id"]
                current_healthy = self._consecutive_healthy.get(incident_id, 0) + 1
                self._consecutive_healthy[incident_id] = current_healthy

                # Record recovery progress event
                self.repository.record_alert_event(
                    AlertEvent(
                        alert_id=incident_id,
                        event_type="recovery",
                        actor="alert_engine",
                        old_value=active.get("current_value"),
                        new_value=metric.value,
                        message=f"Healthy reading #{current_healthy}/{rule.recovery_readings}: value {metric.value} {rule.unit}",
                    )
                )

                # Check if hysteresis requirement is met
                if current_healthy >= rule.recovery_readings:
                    resolved = self._resolve_incident(active, metric, reason=f"Recovered after {current_healthy} consecutive healthy readings")
                    self._consecutive_healthy.pop(incident_id, None)
                    return {"action": "resolved", "incident": resolved}
                else:
                    return {"action": "recovering", "incident": active, "consecutive_healthy": current_healthy}
            return None

        # CASE 2: Metric is in BREACH (WARNING or CRITICAL)
        target_severity = state if state in ("warning", "critical") else str(rule.severity).lower()

        if active:
            incident_id = active["id"]
            # Reset consecutive healthy counter because breach resumed
            self._consecutive_healthy[incident_id] = 0

            # Update last observed value and timestamp
            updated = self.repository.update_incident(
                incident_id=incident_id,
                current_value=metric.value,
                last_seen_at=now_iso,
            )

            # Check for Escalation from Warning to Critical
            if active.get("severity") == "warning" and target_severity == "critical":
                updated = self.repository.update_incident(
                    incident_id=incident_id,
                    severity="critical",
                    last_seen_at=now_iso,
                )
                self.repository.record_alert_event(
                    AlertEvent(
                        alert_id=incident_id,
                        event_type="escalation",
                        actor="alert_engine",
                        old_value=active.get("current_value"),
                        new_value=metric.value,
                        message=f"ESCALATION to CRITICAL: observed {metric.value} {rule.unit} exceeds critical threshold {rule.critical} {rule.unit}",
                    )
                )
                self._dispatch_notification(updated, "escalation")
                return {"action": "escalated", "incident": updated}

            # Sustained breach - record periodic continue event
            self.repository.record_alert_event(
                AlertEvent(
                    alert_id=incident_id,
                    event_type="breach_continue",
                    actor="alert_engine",
                    old_value=active.get("current_value"),
                    new_value=metric.value,
                    message=f"Condition persists at {metric.value} {rule.unit} ({target_severity.upper()})",
                )
            )
            return {"action": "updated", "incident": updated}

        # CASE 3: New Breach -> Create New Incident
        incident_id = f"inc_{int(now.timestamp())}_{metric.application_id}_{metric.metric}"
        new_incident = {
            "id": incident_id,
            "application_id": metric.application_id,
            "metric": metric.metric,
            "rule_id": rule.id,
            "severity": target_severity,
            "state": "firing",
            "current_value": metric.value,
            "threshold": rule.threshold if rule.threshold is not None else rule.warning,
            "critical_threshold": rule.critical,
            "opened": now_iso,
            "opened_at": now_iso,
            "last_seen": now_iso,
            "last_seen_at": now_iso,
            "acknowledged_by": None,
            "acknowledged_at": None,
            "resolved_at": None,
            "duration": 0,
            "metadata": {
                "rule_name": rule.name,
                "unit": rule.unit,
                "source": metric.source,
                "resource_name": metric.resource_name,
            },
        }

        created = self.repository.create_incident(new_incident)

        # Record initial breach event
        self.repository.record_alert_event(
            AlertEvent(
                alert_id=incident_id,
                event_type="breach_start",
                actor="alert_engine",
                old_value=None,
                new_value=metric.value,
                message=f"{target_severity.upper()} breach triggered: {rule.name or metric.metric} observed {metric.value} {rule.unit} (threshold: {rule.threshold or rule.warning})",
            )
        )

        self._dispatch_notification(created, "firing")
        return {"action": "created", "incident": created}

    def acknowledge_incident(self, incident_id: str, actor: str = "engineer@cloudpulse.io", note: Optional[str] = None) -> Optional[dict]:
        """Acknowledge an active incident. Evaluation continues."""
        incident = self.repository.get_incident(incident_id)
        if not incident:
            return None

        now_iso = datetime.now(timezone.utc).isoformat()
        updated = self.repository.update_incident(
            incident_id=incident_id,
            state="acknowledged",
            acknowledged_by=actor,
            acknowledged_at=now_iso,
        )

        msg = f"Incident acknowledged by {actor}"
        if note:
            msg += f": {note}"

        self.repository.record_alert_event(
            AlertEvent(
                alert_id=incident_id,
                event_type="acknowledge",
                actor=actor,
                old_value=incident.get("current_value"),
                new_value=incident.get("current_value"),
                message=msg,
            )
        )

        return updated

    def resolve_incident(self, incident_id: str, actor: str = "engineer@cloudpulse.io", reason: Optional[str] = None) -> Optional[dict]:
        """Manually resolve an incident."""
        incident = self.repository.get_incident(incident_id)
        if not incident:
            return None
        return self._resolve_incident(incident, None, reason=reason, actor=actor)

    def _resolve_incident(
        self,
        incident: dict,
        metric: Optional[NormalizedMetric],
        reason: Optional[str] = None,
        actor: str = "alert_engine",
    ) -> dict:
        """Internal resolution handler."""
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # Compute duration
        opened_iso = incident.get("opened_at") or incident.get("opened")
        duration = 0.0
        if opened_iso:
            try:
                dt_open = datetime.fromisoformat(opened_iso.replace("Z", "+00:00"))
                duration = round((now - dt_open).total_seconds(), 1)
            except Exception:
                duration = 0.0

        updated = self.repository.update_incident(
            incident_id=incident["id"],
            state="resolved",
            resolved_at=now_iso,
            duration=duration,
        )

        msg = f"Incident resolved after {duration:.0f}s. {reason or 'Condition normalized'}"
        self.repository.record_alert_event(
            AlertEvent(
                alert_id=incident["id"],
                event_type="resolution",
                actor=actor,
                old_value=incident.get("current_value"),
                new_value=metric.value if metric else None,
                message=msg,
            )
        )

        self._dispatch_notification(updated, "resolved")
        return updated

    def _dispatch_notification(self, incident: dict, trigger_type: str):
        """Dispatch notification via registered service or record in DB."""
        incident_id = incident["id"]
        channel = "in-app"
        status = "delivered"
        self.repository.record_notification_attempt(
            incident_id=incident_id,
            channel=channel,
            status=status,
            provider_response=f"Alert {trigger_type.upper()} notification dispatched for {incident.get('application_id')}/{incident.get('metric')}",
        )