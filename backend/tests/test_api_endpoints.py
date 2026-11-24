import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_overview_endpoint(client):
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "cpu_memory_chart" in data
    assert "latency_chart" in data
    assert "volume_error_chart" in data
    assert "service_health_distribution" in data
    assert "alert_severity_distribution" in data


def test_services_endpoints(client):
    # List services
    response = client.get("/api/services")
    assert response.status_code == 200
    services = response.json()
    assert len(services) >= 1
    svc_id = services[0]["id"]

    # Service detail
    detail_res = client.get(f"/api/services/{svc_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["service"]["id"] == svc_id


def test_alert_rules_crud(client):
    # Create rule
    new_rule = {
        "id": "test-crud-rule",
        "name": "Integration Test Rule",
        "application_id": "app-01",
        "metric": "cpu",
        "operator": ">",
        "threshold": 75.0,
        "warning": 75.0,
        "critical": 88.0,
        "direction": "above-is-worse",
        "unit": "%",
        "severity": "warning",
    }
    create_res = client.post("/api/alerts/rules", json=new_rule)
    assert create_res.status_code == 201

    # List rules
    list_res = client.get("/api/alerts/rules")
    assert list_res.status_code == 200
    assert any(r["id"] == "test-crud-rule" for r in list_res.json())

    # Update rule
    patch_res = client.patch("/api/alerts/rules/test-crud-rule", json={"warning": 78.0})
    assert patch_res.status_code == 200

    # Delete rule
    del_res = client.delete("/api/alerts/rules/test-crud-rule")
    assert del_res.status_code == 200


def test_settings_patch(client):
    # Update settings
    patch_res = client.patch(
        "/api/settings",
        json={"data_source": "simulated", "collection_interval_seconds": 30},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["data_source"] == "simulated"
    assert patch_res.json()["collection_interval_seconds"] == 30
