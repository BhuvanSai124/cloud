"""Pydantic schemas for normalized metrics, alerts, thresholds, and dashboard views."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

MetricType = Literal[
    "cpu",
    "memory",
    "request_count",
    "latency",
    "p95_latency",
    "error_rate",
    "instance_count",
    "availability",
]

ComparisonOperator = Literal[
    ">",
    ">=",
    "<",
    "<=",
    "==",
    "!=",
]

AlertSeverity = Literal["info", "warning", "critical", "INFO", "WARNING", "CRITICAL"]
AlertStatus = Literal["pending", "firing", "open", "acknowledged", "resolved"]


class NormalizedMetric(BaseModel):
    """Normalized metric schema returned by both SimulatedMetricSource and GcpMetricSource."""

    application_id: str = Field(..., description="Unique application / service identifier")
    metric: MetricType = Field(..., description="Metric type identifier")
    value: Optional[float] = Field(None, description="Metric value; null when unknown/no data")
    unit: Optional[str] = Field(None, description="Unit of measurement (%, ms, req/min, etc.)")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO-8601 timestamp of the metric reading",
    )
    source: Literal["gcp", "simulated"] = Field(..., description="Data source: 'gcp' or 'simulated'")
    resource_name: str = Field(..., description="GCP resource name or simulated identifier")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Optional metadata (environment, instance_id, etc.)"
    )

    model_config = {"use_enum_values": True}

    def is_unknown(self) -> bool:
        return self.value is None

    def is_available(self) -> bool:
        return self.value is not None


class ThresholdRule(BaseModel):
    """Configuration for an alert rule."""

    id: str = Field(..., description="Unique rule identifier")
    name: Optional[str] = Field(None, description="Human-readable rule name")
    description: Optional[str] = Field(None, description="Detailed rule description")
    application_id: str = Field(..., description="Target application or 'all'")
    metric: MetricType = Field(..., description="Metric this rule applies to")
    operator: Optional[ComparisonOperator] = Field(">", description="Comparison operator")
    threshold: Optional[float] = Field(None, description="Base threshold value")
    warning: float = Field(80.0, description="Threshold value for warning state")
    critical: float = Field(90.0, description="Threshold value for critical state")
    direction: Literal["above-is-worse", "below-is-worse"] = Field(
        "above-is-worse", description="Comparison direction"
    )
    unit: str = Field("%", description="Unit of measurement")
    evaluation_window_seconds: int = Field(60, description="Evaluation window in seconds")
    recovery_readings: int = Field(
        3, description="Number of consecutive healthy readings required to resolve"
    )
    cooldown_minutes: int = Field(
        10, description="Minimum minutes between repeated notifications for this rule"
    )
    severity: AlertSeverity = Field("warning", description="Severity level: info, warning, critical")
    enabled: bool = Field(True, description="Whether the rule is active")
    created_at: Optional[str] = Field(None, description="Creation timestamp")
    updated_at: Optional[str] = Field(None, description="Last update timestamp")

    model_config = {"arbitrary_types_allowed": True}

    def check_state(self, value: Optional[float]) -> Literal["healthy", "warning", "critical", "unknown"]:
        """Determine alert state for a given metric value."""
        if value is None:
            return "unknown"

        # If operator and threshold are explicitly provided
        if self.operator and self.threshold is not None:
            breached = False
            if self.operator == ">":
                breached = value > self.threshold
            elif self.operator == ">=":
                breached = value >= self.threshold
            elif self.operator == "<":
                breached = value < self.threshold
            elif self.operator == "<=":
                breached = value <= self.threshold
            elif self.operator == "==":
                breached = abs(value - self.threshold) < 1e-6
            elif self.operator == "!=":
                breached = abs(value - self.threshold) >= 1e-6

            if breached:
                sev = str(self.severity).lower()
                return "critical" if sev == "critical" else "warning"
            return "healthy"

        # Default direction-based warning/critical evaluation
        if self.direction == "above-is-worse":
            if value >= self.critical:
                return "critical"
            if value >= self.warning:
                return "warning"
            return "healthy"
        else:  # below-is-worse
            if value <= self.critical:
                return "critical"
            if value <= self.warning:
                return "warning"
            return "healthy"


class ThresholdRuleCreate(BaseModel):
    """Payload for creating a new alert rule."""

    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    application_id: str
    metric: MetricType
    operator: Optional[ComparisonOperator] = ">"
    threshold: Optional[float] = None
    warning: Optional[float] = 80.0
    critical: Optional[float] = 90.0
    direction: Optional[Literal["above-is-worse", "below-is-worse"]] = "above-is-worse"
    unit: str = "%"
    evaluation_window_seconds: Optional[int] = 60
    recovery_readings: Optional[int] = 3
    cooldown_minutes: Optional[int] = 10
    severity: Optional[AlertSeverity] = "warning"
    enabled: Optional[bool] = True


class ThresholdRuleUpdate(BaseModel):
    """Payload for updating a threshold / alert rule."""

    name: Optional[str] = None
    description: Optional[str] = None
    operator: Optional[ComparisonOperator] = None
    threshold: Optional[float] = None
    warning: Optional[float] = None
    critical: Optional[float] = None
    direction: Optional[str] = None
    unit: Optional[str] = None
    enabled: Optional[bool] = None
    recovery_readings: Optional[int] = None
    cooldown_minutes: Optional[int] = None
    severity: Optional[AlertSeverity] = None


class AlertEvent(BaseModel):
    """An event in the incident timeline."""

    id: str = Field(default_factory=lambda: f"evt_{datetime.now(timezone.utc).timestamp()}")
    alert_id: str
    event_type: Literal[
        "breach_start", "breach_continue", "escalation", "acknowledge", "recovery", "resolution"
    ]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    actor: Optional[str] = None
    old_value: Optional[float] = None
    new_value: Optional[float] = None
    message: str
    metadata: Optional[Dict[str, Any]] = None


class IncidentAcknowledgeRequest(BaseModel):
    actor: Optional[str] = "engineer@cloudpulse.io"
    note: Optional[str] = None


class IncidentResolveRequest(BaseModel):
    actor: Optional[str] = "engineer@cloudpulse.io"
    reason: Optional[str] = "Manual operator resolution after mitigation"


class SettingsUpdate(BaseModel):
    data_source: Optional[Literal["simulated", "gcp"]] = None
    gcp_project_id: Optional[str] = None
    collection_interval_seconds: Optional[int] = None
    notification_cooldown_minutes: Optional[int] = None
    recovery_readings_count: Optional[int] = None
    frontend_origin: Optional[str] = None


class GcpVerifyRequest(BaseModel):
    project_id: Optional[str] = None
    resource_type: Optional[str] = "cloud_run_revision"


class SimulationScenarioRequest(BaseModel):
    scenario: Literal[
        "healthy",
        "cpu_spike",
        "memory_spike",
        "slow_response",
        "http_5xx",
        "app_downtime",
        "service_degradation",
        "recovery",
    ]
    application_id: Optional[str] = "app-01"
    custom_value: Optional[float] = None
    speed: Optional[float] = 1.0


class HistoricalGenerationRequest(BaseModel):
    hours: int = 12
    interval_minutes: int = 5
    seed: Optional[int] = 42