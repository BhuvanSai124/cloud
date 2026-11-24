/* src/pages/GCPComparisonPage.tsx */
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/common";

export default function GCPComparisonPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataSource = location.state?.dataSource || "simulated";

  const [comparison, setComparison] = useState({
    custom_engine: {
      name: "CloudPulse Custom Alert Engine",
      status: dataSource === "gcp" ? "active" : "configured",
      description:
        "Rule-based threshold evaluation with deduplication, escalation,",
      features: [
        "Deduplication by application + metric + rule",
        "Warning → Critical escalation on same incident",
        "Recovery hysteresis: configurable consecutive healthy readings",
        "Acknowledgement with identity and timestamp",
        "Resolution with accurate duration tracking",
        "Notification cooldown to prevent flood",
        "Missing data handled as Unknown (never Healthy substitution)",
      ],
      limitations: [
        "Manual threshold configuration required",
        "No automatic anomaly detection",
        "Requires periodic metric collection",
      ],
    },
    native_gcp: {
      name: "Google Cloud Monitoring Alert Policies",
      status: dataSource === "gcp" ? "active" : "available",
      description:
        "Native GCP alerting with built-in metric types and resource labels",
      features: [
        "Native metric querying with alignment and reducers",
        "Uptime check integration",
        "Built-in notification channels (email, Pub/Sub)",
        "Snooze and deduplication at GCP level",
        "Integration with Incident Manager",
        "Audit logging of alert policy changes",
      ],
      limitations: [
        "Complex metric selection (resource type, alignment, aggregation)",
        "Alert policy version management overhead",
        "Less flexible for custom business logic",
        "Notification channels separate from dashboard",
      ],
    },
    uptime_checks: {
      name: "Uptime Checks",
      status: dataSource === "gcp" ? "available" : "not-configured",
      description:
        "Availability measurement using GCP Uptime Checks",
      features: [
        "External availability monitoring",
        "HTTP, HTTP Basic, TCP protocol support",
        "Synthetic monitoring from GCP regions",
        "SLO error budget calculation",
      ],
      limitations: [
        "Only measures external availability, not internal app health",
        "May have latency in metric ingestion (minutes to hours)",
        "Requires separate configuration per endpoint",
      ],
    },
  });

  // If in GCP mode, try to fetch actual comparison data
  useEffect(() => {
    if (dataSource === "gcp") {
      // In a real implementation, this would query actual GCP alert policies
      // and compare feature sets
      console.log("GCP mode: comparison data would be fetched from GCP APIs");
    }
  }, [dataSource]);

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      active: "✓ Active",
      available: "⚡ Available",
      configured: "⚙️ Configured",
      not_configured: "✗ Not configured",
    };
    return map[status] || status;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6">
        GCP Alerting Comparison
        <span className="text-sm text-gray-400 ml-2">
          {"SIMULATED DEMO"}{" "}
          {dataSource === "gcp" && "(Real GCP mode)"}
        </span>
      </h2>

      <p className="text-gray-400 mb-6">
        Compare the CloudPulse custom alert engine with native Google Cloud
        Monitoring alert policies and uptime checks. The custom engine offers
        greater flexibility for incident management (deduplication, acknowledgement,
        history tracking) while native GCP policies provide integrated metric
        querying and GCP-wide notification channels.
      </p>

      {/* Custom Alert Engine */}
      <div className="mb-4 bg-charcoal rounded p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          {comparison.custom_engine.name}
          <span className={`text-${
            comparison.custom_engine.status === "active" ? "green" : "amber"
          }-400 text-xs ml-1`}>
            {formatStatus(comparison.custom_engine.status)}
          </span>
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          {comparison.custom_engine.description}
        </p>
        <ul className="text-xs text-gray-300 space-y-1">
          {comparison.custom_engine.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {comparison.custom_engine.limitations.length > 0 && (
          <p className="text-xs text-amber-400 mt-2">
            Limitations:
            {comparison.custom_engine.limitations.map((l) => (
              <li key={l} className="mb-1">{l}</li>
            ))}
          </p>
        )}
      </div>

      {/* Native GCP Alert Policies */}
      <div className="mb-4 bg-charcoal rounded p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          {comparison.native_gcp.name}
          <span className={`text-${
            comparison.native_gcp.status === "active" ? "green" : "amber"
          }-400 text-xs ml-1`}>
            {formatStatus(comparison.native_gcp.status)}
          </span>
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          {comparison.native_gcp.description}
        </p>
        <ul className="text-xs text-gray-300 space-y-1">
          {comparison.native_gcp.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {comparison.native_gcp.limitations.length > 0 && (
          <p className="text-xs text-amber-400 mt-2">
            Limitations:
            {comparison.native_gcp.limitations.map((l) => (
              <li key={l} className="mb-1">{l}</li>
            ))}
          </p>
        )}
      </div>

      {/* Uptime Checks */}
      <div className="mb-4 bg-charcoal rounded p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          {comparison.uptime_checks.name}
          <span className={`text-${
            comparison.uptime_checks.status === "available" ? "green" : "amber"
          }-400 text-xs ml-1`}>
            {formatStatus(comparison.uptime_checks.status)}
          </span>
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          {comparison.uptime_checks.description}
        </p>
        <ul className="text-xs text-gray-300 space-y-1">
          {comparison.uptime_checks.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {comparison.uptime_checks.limitations.length > 0 && (
          <p className="text-xs text-amber-400 mt-2">
            Limitations:
            {comparison.uptime_checks.limitations.map((l) => (
              <li key={l} className="mb-1">{l}</li>
            ))}
          </p>
        )}
      </div>

      {/* Key differences summary */}
      <div className="mt-6 p-4 bg-navy rounded">
        <h3 className="text-sm font-medium text-cyan mb-3">Key Differences</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Custom (CloudPulse)</h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>Dedicated incident timeline & history</li>
              <li>Acknowledgement with actor identity</li>
              <li>Recovery hysteresis tracking</li>
              <li>Configurable cooldown & notification policy</li>
              <li>Rule-driven (human-defined thresholds)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Native GCP</h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>Native metric querying with reducers</li>
              <li>Built-in uptime check integration</li>
              <li>GCP-wide notification channels</li>
              <li>Incident Manager integration</li>
              <li>Audit logging & policy versioning</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Coexistence note */}
      <div className="mt-6 p-4 bg-charcoal rounded">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Coexistence
        </h3>
        <p className="text-xs text-gray-400">
          Custom incidents and native GCP incidents remain clearly distinguished
          in CloudPulse. When running in simulated mode, all incidents are
          marked "SIMULATED DEMO". When in GCP mode, native Cloud Monitoring
          alert creations are tracked separately from custom CloudPulse incidents,
          though the dashboard unifies the viewing experience.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Both systems can operate simultaneously: CloudPulse custom rules
          evaluate alongside native alert policies, providing a unified view
          of application health.
        </p>
      </div>
    </div>
  );
}