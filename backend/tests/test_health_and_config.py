import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    """Verify health endpoint returns status ok, data source, and database connectivity."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "data_source" in data
    assert "source_health" in data
    assert data["database"] == "healthy"
    assert "timestamp" in data


def test_root_health_endpoint(client):
    """Verify legacy /health endpoint works."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_config_endpoint(client):
    """Verify config endpoint returns configuration metadata."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert "data_source" in data
    assert "collection_interval_seconds" in data
    assert "demo_thresholds" in data
