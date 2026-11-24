import os
import pytest
from datetime import datetime, timezone
from app.database.sqlite_repo import SQLiteRepository
from app.services.alert_engine import AlertEngine
from app.schemas.metrics import NormalizedMetric, ThresholdRule


@pytest.fixture
def repo(tmp_path):
    db_file = str(tmp_path / "test_alerts.db")
    repository = SQLiteRepository(db_path=db_file)
    yield repository
    repository.close()


@pytest.fixture
def engine(repo):
    return AlertEngine(repository=repo)


def test_rule_evaluation_healthy(engine, repo):
    rule = ThresholdRule(
        id="test-rule-cpu",
        name="Test CPU Rule",
        application_id="app-01",
        metric="cpu",
        warning=80.0,
        critical=90.0,
        direction="above-is-worse",
        unit="%",
    )
    metric = NormalizedMetric(
        application_id="app-01",
        metric="cpu",
        value=50.0,
        unit="%",
        timestamp=datetime.now(timezone.utc),
        source="simulated",
        resource_name="app-01",
    )

    res = engine.evaluate_metric(metric, rule)
    assert res is None  # Healthy metric produces no incident


def test_rule_evaluation_breach_and_deduplication(engine, repo):
    rule = ThresholdRule(
        id="test-rule-cpu",
        name="Test CPU Rule",
        application_id="app-01",
        metric="cpu",
        warning=80.0,
        critical=90.0,
        direction="above-is-worse",
        unit="%",
    )
    metric_breach = NormalizedMetric(
        application_id="app-01",
        metric="cpu",
        value=85.0,  # Warning breach
        unit="%",
        timestamp=datetime.now(timezone.utc),
        source="simulated",
        resource_name="app-01",
    )

    # 1. First breach creates incident
    res1 = engine.evaluate_metric(metric_breach, rule)
    assert res1 is not None
    assert res1["action"] == "created"
    incident = res1["incident"]
    assert incident["severity"] == "warning"
    assert incident["state"] == "firing"

    # 2. Second breach with same condition MUST update existing incident, not create duplicate
    res2 = engine.evaluate_metric(metric_breach, rule)
    assert res2 is not None
    assert res2["action"] == "updated"

    # Verify database has exactly 1 active incident
    active_incidents = repo.list_incidents(application_id="app-01", state="firing")
    assert len(active_incidents) == 1


def test_escalation_from_warning_to_critical(engine, repo):
    rule = ThresholdRule(
        id="test-rule-cpu",
        name="Test CPU Rule",
        application_id="app-01",
        metric="cpu",
        warning=80.0,
        critical=90.0,
        direction="above-is-worse",
        unit="%",
    )

    # Warning breach
    metric_warn = NormalizedMetric(
        application_id="app-01",
        metric="cpu",
        value=82.0,
        unit="%",
        timestamp=datetime.now(timezone.utc),
        source="simulated",
        resource_name="app-01",
    )
    res_warn = engine.evaluate_metric(metric_warn, rule)
    assert res_warn["action"] == "created"
    assert res_warn["incident"]["severity"] == "warning"

    # Escalation to critical
    metric_crit = NormalizedMetric(
        application_id="app-01",
        metric="cpu",
        value=95.0,  # Exceeds critical 90.0
        unit="%",
        timestamp=datetime.now(timezone.utc),
        source="simulated",
        resource_name="app-01",
    )
    res_crit = engine.evaluate_metric(metric_crit, rule)
    assert res_crit["action"] == "escalated"
    assert res_crit["incident"]["severity"] == "critical"


def test_recovery_hysteresis(engine, repo):
    rule = ThresholdRule(
        id="test-rule-cpu",
        name="Test CPU Rule",
        application_id="app-01",
        metric="cpu",
        warning=80.0,
        critical=90.0,
        direction="above-is-worse",
        unit="%",
        recovery_readings=3,
    )

    # Cause breach
    metric_breach = NormalizedMetric(
        application_id="app-01",
        metric="cpu",
        value=85.0,
        unit="%",
        timestamp=datetime.now(timezone.utc),
        source="simulated",
        resource_name="app-01",
    )
    engine.evaluate_metric(metric_breach, rule)

    metric_healthy = NormalizedMetric(
        application_id="app-01",
        metric="cpu",
        value=50.0,
        unit="%",
        timestamp=datetime.now(timezone.utc),
        source="simulated",
        resource_name="app-01",
    )

    # Reading 1: recovering (not resolved yet)
    r1 = engine.evaluate_metric(metric_healthy, rule)
    assert r1["action"] == "recovering"
    assert r1["consecutive_healthy"] == 1

    # Reading 2: recovering (not resolved yet)
    r2 = engine.evaluate_metric(metric_healthy, rule)
    assert r2["action"] == "recovering"
    assert r2["consecutive_healthy"] == 2

    # Reading 3: reaches threshold of 3 -> resolves
    r3 = engine.evaluate_metric(metric_healthy, rule)
    assert r3["action"] == "resolved"
    assert r3["incident"]["state"] == "resolved"
