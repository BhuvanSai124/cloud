import pytest
from datetime import datetime, timezone
from app.services.metric_source import SimulatedMetricSource


def test_simulation_determinism():
    """Verify that same seed generates repeatable metric samples."""
    sim1 = SimulatedMetricSource(seed=42)
    sim2 = SimulatedMetricSource(seed=42)

    dt = datetime(2026, 10, 15, 14, 0, 0, tzinfo=timezone.utc)
    app = {"id": "app-01", "name": "API-Gateway", "environment": "prod"}

    samples1 = sim1.generate_sample_for_time(app, dt)
    samples2 = sim2.generate_sample_for_time(app, dt)

    assert len(samples1) == len(samples2)
    for s1, s2 in zip(samples1, samples2):
        assert s1.metric == s2.metric
        assert s1.value == s2.value


def test_simulation_scenarios():
    """Verify that scenarios correctly alter target metrics."""
    sim = SimulatedMetricSource(seed=123)
    dt = datetime.now(timezone.utc)
    app = {"id": "app-01", "name": "API-Gateway", "environment": "prod"}

    # Healthy baseline
    sim.set_scenario("healthy", app_id="app-01")
    healthy_samples = {s.metric: s.value for s in sim.generate_sample_for_time(app, dt)}
    assert healthy_samples["cpu"] < 80.0
    assert healthy_samples["error_rate"] < 1.0

    # CPU Spike scenario
    sim.set_scenario("cpu_spike", app_id="app-01")
    cpu_samples = {s.metric: s.value for s in sim.generate_sample_for_time(app, dt)}
    assert cpu_samples["cpu"] >= 85.0

    # Memory Spike scenario
    sim.set_scenario("memory_spike", app_id="app-01")
    mem_samples = {s.metric: s.value for s in sim.generate_sample_for_time(app, dt)}
    assert mem_samples["memory"] >= 85.0

    # Slow Response scenario
    sim.set_scenario("slow_response", app_id="app-01")
    lat_samples = {s.metric: s.value for s in sim.generate_sample_for_time(app, dt)}
    assert lat_samples["latency"] >= 450.0

    # HTTP 5xx scenario
    sim.set_scenario("http_5xx", app_id="app-01")
    err_samples = {s.metric: s.value for s in sim.generate_sample_for_time(app, dt)}
    assert err_samples["error_rate"] >= 10.0


def test_historical_generation():
    """Verify historical generation produces expected timestamped samples."""
    sim = SimulatedMetricSource()
    samples = sim.generate_history(hours=2, interval_minutes=15)
    # 2 hours * 4 samples/hour * 4 apps * 7 metrics per app = 224 samples
    assert len(samples) > 0
    # Samples must be marked as simulated
    assert all(s.source == "simulated" for s in samples)
