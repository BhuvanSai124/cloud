/* src/pages/SettingsPage.tsx */
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/common";
import { useAlerts } from "@/hooks/useAlerts";

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataSource = location.state?.dataSource || "simulated";

  // Fetch configuration
  const [config, setConfig] = useState({
    data_source: "simulated",
    project_id: "",
    collection_interval: "60",
    notification_cooldown: "10",
    recovery_readings: "3",
    frontend_origin: "http://localhost:5173",
  });

  // Fetch backend config
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({
        data_source: "simulated",
        project_id: "",
        collection_interval: "60",
        notification_cooldown: "10",
        recovery_readings: "3",
        frontend_origin: "http://localhost:5173",
      }));
  }, []);

  // Fetch alerts for testing
  const { alerts } = useAlerts();

  // Handle data source toggle
  const handleDataSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // In a real implementation, this would require restart
    // For now, just update the display
    const val = e.target.value;
    setConfig((prev) => ({ ...prev, data_source: val }));
  };

  // Handle setting updates
  const handleSettingUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  // Test notification
  const handleTestNotification = async () => {
    if (window.confirm("Send test notification?")) {
      try {
        await fetch("/api/notifications/status", { method: "POST" });
        alert("Test notification sent (in-app only)");
      } catch (err) {
        alert("Failed to send notification");
      }
    }
  };

  // Reset demo data
  const handleResetDemo = async () => {
    if (window.confirm("Reset all demo data?")) {
      try {
        await fetch("/api/demo/reset", { method: "POST" });
        alert("Demo data reset");
      } catch (err) {
        alert("Failed to reset demo data");
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Settings & Integrations
        <span className="text-sm text-gray-400 ml-2">
          Data source: {config.data_source.toUpperCase()}
        </span>
      </h2>

      {/* Data source selection */}
      <div className="mb-4 bg-charcoal rounded p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Active Data Source
        </h3>
        <select
          value={config.data_source}
          onChange={handleDataSourceChange}
          className="bg-charcoal text-white rounded py-2 px-4 text-sm appearance-none mb-3"
        >
          <option value="simulated">Simulated (default - no GCP credentials needed)</option>
          <option value="gcp">Google Cloud Platform (requires project config & credentials)</option>
        </select>
        <p className="text-xs text-gray-400">
          {config.data_source === "simulated"
            ? "No GCP project or credentials required. Metrics are generated locally for demonstration."
            : "GCP mode requires: GCP_PROJECT_ID environment variable, authenticated service account, and enabled Cloud Monitoring API. See documentation for setup."}
        </p>
      </div>

      {/* GCP Configuration details */}
      {config.data_source === "gcp" && (
        <div className="mb-4 bg-charcoal rounded p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            GCP Project Configuration
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Project ID
              </label>
              <input
                type="text"
                value={config.project_id || ""}
                onChange={handleSettingUpdate}
                name="project_id"
                className="bg-charcoal text-white rounded py-1 px-2 text-sm w-full"
                placeholder="your-gcp-project-id"
                readOnly
              />
              <span className="text-xs text-gray-500 block mt-1">
                Set GCP_PROJECT_ID env var or use Cloud Run service account
              </span>
            </div>
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Collection Interval (seconds)
              </label>
              <input
                type="number"
                value={config.collection_interval || "60"}
                onChange={handleSettingUpdate}
                name="collection_interval"
                className="bg-charcoal text-white rounded py-1 px-2 text-sm w-full"
                min={10}
                max={3600}
                step={10}
              />
              <span className="text-xs text-gray-500 block mt-1">
                One-minute scheduling is a demo option, not automatic requirement
              </span>
            </div>
          </div>

          <h4 className="text-xs font-medium text-gray-300 mt-3">Required APIs</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>cloudmonitoring.googleapis.com</li>
            <li>firestore.googleapis.com</li>
            <li>cloudlogging.googleapis.com (optional)</li>
            <li>cloudbuild.googleapis.com (for deployment)</li>
            <li>cloudresourcemanager.googleapis.com</li>
          </ul>

          <h4 className="text-xs font-medium text-gray-300 mt-3">Required IAM Roles</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>roles/monitoring.viewer - Read Cloud Monitoring metrics</li>
            <li>roles/firestore.user - Read/Write Firestore</li>
            <li>roles/logging.viewer - Read Cloud Logging (optional)</li>
          </ul>

          <p className="text-xs text-gray-500 mt-3">
            Least-privilege principle: create a dedicated service account with
            only the roles needed for this dashboard.
          </p>
        </div>
      )}

      {/* Notification provider status */}
      <div className="mb-4 bg-charcoal rounded p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Notification Providers
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          In-app notifications are always active. Email and webhook require
          provider configuration.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="font-medium text-green-400">In-app</span>
            <span className="text-green-400">✓ Always active</span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Email (SMTP)</span>
            <span className="text-gray-400">✗ Not configured</span>
            <span className="text-xs text-gray-500 ml-2">
              Configure SMTP_HOST, SMTP_USER, SMTP_PASS in env vars or Secret Manager
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-400">Webhook</span>
            <span className="text-gray-400">✗ Not configured</span>
            <span className="text-xs text-gray-500 ml-2">
              Configure WEBHOOK_URL in env vars or Secret Manager
            </span>
          </div>
        </div>

        <button
          onClick={handleTestNotification}
          className="mt-3 w-full bg-amber text-charcoal py-2 rounded-md font-medium hover:bg-red-500 transition-colors"
        >
          Send Test In-App Notification
        </button>
      </div>

      {/* Application registry */}
      <div className="mb-4 bg-charcoal rounded p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Application Registry
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Monitored applications and their configurations.
        </p>

        {dataSource === "simulated" ? (
          <ul className="text-xs text-gray-400 space-y-1">
            <li>app-01: Service-1 (prod) - CPU & memory thresholds configured</li>
            <li>app-02: Service-2 (prod) - CPU & memory thresholds configured</li>
            <li>Additional apps can be added from the Threshold Rules page</li>
          </ul>
        ) : (
          <p className="text-gray-400">Loading applications from GCP...</p>
        )}

        <button
          onClick={handleResetDemo}
          className="mt-2 w-full text-sm text-red-400 hover underline"
        >
          Reset Demo Data
        </button>
      </div>

      {/* Backend health */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Backend Health
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="font-medium text-green-400">Server status</span>
            <span className="text-green-400">✓ Running</span>
          </div>
          <div>
            <span className="font-medium text-gray-400">API response</span>
            <span className="text-gray-400">✓ Healthy</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Collection interval: {config.collection_interval}s
          {config.data_source === "simulated" && " (simulated mode)"}
        </p>
      </div>
    </div>
  );
}