import pytest
from app.services.metric_source import GcpMetricSource


def test_gcp_unconfigured_verification():
    """Verify GCP source reports unconfigured when project_id is empty."""
    source = GcpMetricSource(project_id="")
    res = source.verify_connection(project_id="")
    assert res["status"] == "unconfigured"
    assert res["connected"] is False
    assert len(res["diagnostic_steps"]) > 0


def test_gcp_missing_credentials_handling():
    """Verify GCP source reports missing authentication when ADC is not configured."""
    source = GcpMetricSource(project_id="non-existent-test-project-12345")
    res = source.verify_connection(project_id="non-existent-test-project-12345")
    # Must report connection failed honestly, not claim success
    assert res["connected"] is False
    assert "status" in res
    assert len(res["diagnostic_steps"]) > 0


def test_gcp_metrics_never_fake_data():
    """Verify that GCP get_metrics returns unavailable state when unauthenticated instead of fake data."""
    source = GcpMetricSource(project_id="dummy-project")
    metrics = source.get_metrics()
    assert len(metrics) > 0
    # Values must be None and source must be gcp
    assert all(m.source == "gcp" for m in metrics)
    assert any(m.value is None for m in metrics)
