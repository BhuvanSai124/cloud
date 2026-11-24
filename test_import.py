#!/usr/bin/env python
import sys
import importlib.util

# Add backend to path
sys.path.insert(0, r'C:\Users\sai\OneDrive\Desktop\Cloud mini\backend')

# Load the main module
spec = importlib.util.spec_from_file_location("main", r"C:\Users\sai\OneDrive\Desktop\Cloud mini\backend\app\main.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

# Test imports
from app.core.config import get_settings
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

print("\nAll tests passed!")