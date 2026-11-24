#!/usr/bin/env python
import sys
import os

# Add backend to path
sys.path.insert(0, r'C:\Users\sai\OneDrive\Desktop\Cloud mini\backend')
sys.path.insert(0, r'C:\Users\sai\OneDrive\Desktop\Cloud mini')

# Import components directly
from app.core.config import get_settings, Settings
from app.schemas.metrics import NormalizedMetric, ThresholdRule
from app.services.metric_source import SimulatedMetricSource
from app.services.alert_engine import AlertEngine
from app.database.sqlite_repo import SQLiteRepository

print("All imports successful")

# Test creating settings
settings = get_settings()
print(f"DATA_SOURCE: {settings.DATA_SOURCE}")

# Test creating a simulated metric source
source = SimulatedMetricSource()
metrics = source.get_metrics()
print(f"Generated {len(metrics)} simulated metrics")

# Test a threshold rule
rule = ThresholdRule(
    id="test-rule",
    application_id="app-01",
    metric="cpu",
    warning=80.0,
    critical=90.0,
    direction="above-is-worse",
    unit="percent",
)
state = rule.check_state(85.0)
print(f"CPU at 85% with rule {rule.id}: state = {state}")

# Test unknown value
state_unk = rule.check_state(None)
print(f"CPU value is None: state = {state_unk}")

# Test creating a normalized metric
metric = NormalizedMetric(
    application_id="app-01",
    metric="cpu",
    value=85.0,
    unit="percent",
    timestamp=__import__('datetime').datetime.now(__import__('datetime').timezone.utc),
    source="simulated",
    resource_name="app-01",
    metadata={"env": "prod"},
)
print(f"Created metric: {metric.metric} = {metric.value} {metric.unit}")
print(f"Metric is_available: {metric.is_available()}")
print(f"Metric is_unknown: {metric.is_unknown()}")

print("\nAll tests passed!")