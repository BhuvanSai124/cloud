/* src/pages/DemoLabPage.tsx */
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/common";
import { useAlerts } from "@/hooks/useAlerts";
import { NormalizedMetric } from "@/types/api";
import { simulateScenario, startDrill, nextDrillStep, resetDrill } from "@/services/demo";
import { formatMetric } from "@/utils/thresholds";

export default function DemoLabPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataSource = location.state?.dataSource || "simulated";

  // Drill state
  const [drillStep, setDrillStep] = useState(0);
  const [drillActive, setDrillActive] = useState(false);
  const [scenario, setScenario] = useState("cpu_spike" as const);
  const [scenarios] = useState<{
    label: string;
    metric: string;
    value: number;
    unit: string;
    description: string;
  }>([
    {
      label: "CPU Spike",
      metric: "cpu",
      value: 95,
      unit: "percent",
      description: "Simulate CPU utilization spike to 95%",
    },
    {
      label: "Memory Spike",
      metric: "memory",
      value: 95,
      unit: "percent",
      description: "Simulate memory utilization spike to 95%",
    },
    {
      label: "Slow Response",
      metric: "latency",
      value: 500,
      unit: "milliseconds",
      description: "Simulate increased response latency (500ms)",
    },
    {
      label: "HTTP 5xx Errors",
      metric: "error_rate",
      value: 15,
      unit: "percent",
      description: "Simulate HTTP 5xx error spike (15%)",
    },
    {
      label: "Application Downtime",
      metric: "availability",
      value: 0,
      unit: "percent",
      description: "Simulate application downtime (0% availability)",
    },
  ]);

  // Collection state
  const { alerts, isLoading } = useAlerts();

  // Form state for manual metric
  const [manualMetric, setManualMetric] = useState({
    application_id: "app-01",
    metric: "cpu" as const,
    value: "",
    unit: "percent" as const,
  });

  // Drill progress tracking
  const [drillProgress, setDrillProgress] = useState({
    current: "Baseline healthy",
    step: 1,
    total: 9,
  });

  // Handle scenario change
  const handleScenarioChange = (newScenario: typeof scenarios[number]) => {
    setScenario(newScenario);
    setManualMetric({
      application_id: "app-01",
      metric: newScenario.metric,
      value: "",
      unit: newScenario.unit,
    });
  };

  // Start guided drill
  const handleStartDrill = async () => {
    const result = await startDrill();
    setDrillStep(result.step);
    setDrillActive(true);
    setDrillProgress({
      current: result.status,
      step: result.step,
      total: 9,
    });
  };

  // Advance drill step
  const handleDrillStep = async (step: number) => {
    const result = await nextDrillStep(step);
    setDrillStep(result.step);
    setDrillProgress({
      current: result.status,
      step: result.step,
      total: 9,
    });
    if (result.completed) {
      setDrillActive(false);
    }
  };

  // Reset demo data
  const handleReset = async () => {
    if (window.confirm("Reset all demo data and scenarios?")) {
      await resetDrill();
      setDrillStep(0);
      setDrillActive(false);
      setDrillProgress({
        current: "Baseline healthy",
        step: 1,
        total: 9,
      });
      setScenario("cpu_spike" as const);
      // Refresh alerts
      fetch("/api/alerts").then(() => {}).catch(() => {});
    }
  };

  // Manual collection trigger
  const handleCollect = async () => {
    try {
      await fetch("/api/collect", { method: "POST" });
    } catch (err) {
      console.error("Collection failed:", err);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6">
        Demo Lab — CloudPulse Simulation Console
        <span className="text-sm text-amber-400 ml-2">
          {"SIMULATED DEMO — No real GCP metrics used"}
        </span>
      </h2>

      {/* Data source badge */}
      <div className="mb-4 bg-charcoal rounded p-3 flex items-center justify-between">
        <span>
          Data source:{" "}
          <span className={`font-medium text-${
            dataSource === "gcp" ? "cyan" : "amber"
          }`}>
            {dataSource.toUpperCase()}
          </span>
        </span>
        <span className="text-xs text-gray-400">
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Scenario selector */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Select Scenario</h3>
        <div className="grid grid-cols-2 gap-2">
          {scenarios.map((s) => (
            <Button
              key={s.label}
              onClick={() => handleScenarioChange(s)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                scenario.label === s.label
                  ? "bg-cyan text-charcoal"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Guided Drill section */}
      {drillActive && drillStep > 0 ? (
        <div className="mb-4 p-4 bg-charcoal rounded">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Guided Incident Drill — Step {drillStep}/9
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            {getDrillStepDescription(drillStep)}
          </p>
          <div className="space-y-2">
            {drillStep > 1 && (
              <Button
                onClick={() => handleDrillStep(drillStep - 1)}
                className="flex-1 bg-gray-700 hover:bg-gray-600"
              >
                Previous
              </Button>
            )}
            {drillStep < 9 && (
              <Button
                onClick={() => handleDrillStep(drillStep + 1)}
                className="flex-1 bg-cyan text-charcoal hover:bg-blue-600"
              >
                Next
              </Button>
            )}
            {drillStep === 9 && (
              <Button
                onClick={() => handleDrillStep(1)}
                className="flex-1 bg-green-600 hover:bg-green-500"
              >
                Reset Drill
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {drillStep === 9 ? "Drill complete!" : "Progress through the incident lifecycle"}
          </p>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Guided Incident Drill
          </h3>
          <p className="text-gray-400 mb-3">
            Walk through a deterministic incident: CPU warning → critical →
            escalation → acknowledgement → recovery → resolution. Each step
            calls the backend pipeline and updates the incident timeline.
          </p>
          <Button
            onClick={() => handleStartDrill()}
            className="w-full bg-cyan text-charcoal py-2 rounded-md font-medium hover:bg-blue-600 transition-colors"
          >
            Start Guided Drill
          </Button>
        </div>
      )}

      {/* Manual simulation section */}
      <div className="mt-6 p-4 bg-charcoal rounded">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Manual Metric Simulation
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Simulate a metric breach to test the alert engine pipeline.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(
              (e.target as HTMLFormElement).elements.namedValue("value").value
            );
            if (!isNaN(value)) {
              setManualMetric((prev) => ({
                ...prev,
                value,
              }));
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Application
              </label>
              <select
                value={manualMetric.application_id}
                onChange={(e) =>
                  setManualMetric((prev) => ({
                    ...prev,
                    application_id: e.target.value,
                  }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
              >
                <option value="app-01">app-01</option>
                <option value="app-02">app-02</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Metric
              </label>
              <select
                value={manualMetric.metric}
                onChange={(e) =>
                  setManualMetric((prev) => ({
                    ...prev,
                    metric: e.target.value as const,
                  }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
              >
                <option value="cpu">CPU</option>
                <option value="memory">Memory</option>
                <option value="latency">Latency</option>
                <option value="error_rate">Error rate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Value
              </label>
              <input
                type="number"
                value={manualMetric.value || ""}
                onChange={(e) =>
                  setManualMetric((prev) => ({
                    ...prev,
                    value: Number(e.target.value) || 0,
                  }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
                min={0}
                max={100}
                step={0.1}
              />
              <span className="text-xs text-gray-400">
                {manualMetric.unit}
              </span>
            </div>
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Unit
              </label>
              <select
                value={manualMetric.unit}
                onChange={(e) =>
                  setManualMetric((prev) => ({
                    ...prev,
                    unit: e.target.value as const,
                  }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
              >
                <option value="percent">%</option>
                <option value="milliseconds">ms</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-amber text-charcoal py-2 rounded-md font-medium hover:bg-red-500 transition-colors"
          >
            Trigger Metric
          </button>
        </form>
      </div>

      {/* Active alerts / incidents from current scenario */}
      <div className="mt-6 p-4 bg-charcoal rounded">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Active Incidents
        </h3>
        {isLoading ? (
          <p className="text-gray-400">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="text-gray-400">
            No active incidents. Trigger a scenario above to create one.
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert: any) => (
              <li
                key={alert.id}
                className="p-3 rounded bg-charcoal border-t border-amber"
              >
                <div className="flex justify-between align-baseline">
                  <span className="font-medium text-charcoal">
                    {alert.id} — {alert.application_id} / {alert.metric}
                  </span>
                  <span
                    className={`text-amber font-medium`}
                  >
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Value: {alert.current_value !== null ? (
                    `${alert.current_value}${alert.unit || ""}`
                  ) : "No data"} — Threshold: {
                    alert.threshold
                  }{alert.unit || ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* Helper: get description for drill step */
function getDrillStepDescription(step: number): string {
  const descriptions: Record<number, string> = {
    1: "Baseline: all metrics healthy",
    2: "Trigger CPU warning breach (value >= warning threshold)",
    3: "Trigger critical breach (value >= critical threshold) — escalation on same incident",
    4: "Acknowledge the incident",
    5: "Restore normal readings (value drops below warning)",
    6: "Feed consecutive recovery readings",
    7: "Resolve the incident after hysteresis satisfied",
    8: "Incident resolved — display timeline and duration",
    9: "Drill complete — ready to restart",
  };
  return descriptions[step] || "Unknown step";
}