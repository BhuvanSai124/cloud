import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_full_incident_lifecycle(client):
    """End-to-end integration test:

    1. Reset simulation to ensure clean baseline
    2. Trigger simulated anomaly scenario (cpu_spike)
    3. Verify incident is created in persistent storage
    4. Verify incident appears in dashboard overview and incidents list
    5. Acknowledge the incident
    6. Verify incident state updates to acknowledged with actor recorded
    7. Reset simulation to healthy / trigger recovery
    8. Verify incident resolution
    """
    # Step 0: Ensure baseline is clean
    client.post("/api/simulation/reset")

    # Step 1: Trigger anomaly scenario
    res_spike = client.post("/api/simulation/scenario?scenario=cpu_spike&target_app=app-01")
    assert res_spike.status_code == 200

    # Step 2: Fetch incidents list
    res_incidents = client.get("/api/incidents?state=open")
    assert res_incidents.status_code == 200
    open_incidents = res_incidents.json()
    assert len(open_incidents) >= 1

    target_incident = open_incidents[0]
    inc_id = target_incident["id"]

    # Step 3: Check overview page includes this active incident
    res_overview = client.get("/api/overview")
    assert res_overview.status_code == 200
    overview_data = res_overview.json()
    assert overview_data["active_incidents"] >= 1

    # Step 4: Acknowledge the incident
    res_ack = client.post(
        f"/api/incidents/{inc_id}/acknowledge",
        json={"actor": "sre-lead@cloudpulse.io", "note": "Investigating node capacity"},
    )
    assert res_ack.status_code == 200
    assert res_ack.json()["state"] == "acknowledged"
    assert res_ack.json()["acknowledged_by"] == "sre-lead@cloudpulse.io"

    # Step 5: Check incident detail has audit timeline event
    res_detail = client.get(f"/api/incidents/{inc_id}")
    assert res_detail.status_code == 200
    events = res_detail.json()["events"]
    assert any(e["event_type"] == "acknowledge" for e in events)

    # Step 6: Resolve incident
    res_resolve = client.post(
        f"/api/incidents/{inc_id}/resolve",
        json={"actor": "sre-lead@cloudpulse.io", "reason": "Autoscaling mitigated load"},
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["state"] == "resolved"

    # Step 7: Verify incident is now resolved
    res_resolved_detail = client.get(f"/api/incidents/{inc_id}")
    assert res_resolved_detail.json()["state"] == "resolved"
    assert res_resolved_detail.json()["duration"] >= 0
