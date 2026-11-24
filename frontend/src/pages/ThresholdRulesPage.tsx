/* src/pages/ThresholdRulesPage.tsx */
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Form,
  Input,
  Button as LucideButton,
} from "@/components/ui/common";
import { useState as useFormState } from "react";
import { ThresholdRule, Application } from "@/types/api";
import { useAlerts } from "@/hooks/useAlerts";
import { API } from "@/utils/api";
import { formatMetric } from "@/utils/thresholds";

export default function ThresholdRulesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataSource = location.state?.dataSource || "simulated";

  // Fetch applications for filtering
  const [apps, setApps] = useState<Application[]>([]);
  useEffect(() => {
    fetch("/api/apps").then((r) => r.json()).then(setApps).catch(() => setApps([]));
  }, []);

  // Fetch existing rules
  const [rules, setRules] = useState<ThresholdRule[]>([]);
  useEffect(() => {
    fetch("/api/thresholds").then((r) => r.json()).then(setRules).catch(() => setRules([]));
  }, []);

  // Filter rules by application
  const appFilter = searchParams.get("application_id") || "";
  const filteredRules = appFilter
    ? rules.filter((r: ThresholdRule) => r.application_id === appFilter)
    : rules;

  // Form state
  const [form, setForm] = useState({
    application_id: appFilter || "",
    metric: "cpu" as const,
    warning: "",
    critical: "",
    direction: "above-is-worse" as const,
    unit: "percent" as const,
    enabled: true,
    recovery_readings: 3,
    cooldown_minutes: 10,
  });

  // Select application
  const handleAppChange = (appId: string) => {
    setForm((prev) => ({ ...prev, application_id: appId }));
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("application_id", appId);
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  // Fetch applications on mount
  useEffect(() => {
    fetch("/api/apps").then((r) => r.json()).then(setApps).catch(() => setApps([]));
  }, [appFilter]);

  // Fetch rules on mount
  useEffect(() => {
    fetch("/api/thresholds").then((r) => r.json()).then(setRules).catch(() => setRules([]));
  }, [appFilter]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ruleData = {
        ...form,
        application_id: form.application_id || "app-01",
      };
      // If rule has an ID, update it; otherwise create new
      if (form.id) {
        await fetch(`/api/thresholds/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/thresholds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      // Refresh rules
      fetch("/api/thresholds").then((r) => r.json()).then(setRules).catch(() => setRules([]));
      setForm({
        application_id: appFilter || "",
        metric: "cpu" as const,
        warning: "",
        critical: "",
        direction: "above-is-worse" as const,
        unit: "percent" as const,
        enabled: true,
        recovery_readings: 3,
        cooldown_minutes: 10,
      });
    } catch (err) {
      console.error("Failed to save rule:", err);
    }
  };

  // Handle rule deletion
  const handleDelete = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      await fetch(`/api/thresholds/${ruleId}`, { method: "DELETE" });
      fetch("/api/thresholds").then((r) => r.json()).then(setRules).catch(() => setRules([]));
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Threshold Rules
        {appFilter && (
          <p className="text-sm text-gray-400">
            Filtered by application:{" "}
            {apps.find((a) => a.id === appFilter)?.name || "unknown"}
          </p>
        )}
      </h2>

      {/* Application filter */}
      {apps.length > 0 && (
        <div className="mb-4 bg-charcoal rounded p-3">
          <label className="text-sm text-gray-300 mb-1 block">
            Application:
          </label>
          <select
            onChange={(e) => handleAppChange(e.target.value)}
            className="bg-navy text-white rounded px-2 py-1 text-sm"
          >
            <option value="">All Applications</option>
            {apps.map((app) => (
              <option
                key={app.id}
                value={app.id}
                selected={form.application_id === app.id}
              >
                {app.name} ({app.environment})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Form for creating/updating rule */}
      <div className="bg-charcoal rounded p-4 mb-4">
        <form onSubmit={handleSubmit} className="p-4">
          <input
            type="hidden"
            name="id"
            defaultValue={form.id || ""}
          />
          <input
            type="hidden"
            name="application_id"
            defaultValue={form.application_id || ""}
          />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Application
              </label>
              <select
                value={form.application_id || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    application_id: e.target.value,
                    warning: "",
                    critical: "",
                  }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
              >
                <option value="">-- Select Application --</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.environment})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Metric
              </label>
              <select
                value={form.metric || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, metric: e.target.value as any }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
              >
                <option value="cpu">CPU utilization</option>
                <option value="memory">Memory utilization</option>
                <option value="request_count">Request count</option>
                <option value="latency">Average latency</option>
                <option value="p95_latency">p95 latency</option>
                <option value="error_rate">Error rate</option>
                <option value="instance_count">Instance count</option>
                <option value="availability">Availability</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Warning threshold
              </label>
              <input
                type="number"
                value={form.warning || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, warning: Number(e.target.value) || 0 }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
                min={0}
                step={0.1}
                placeholder="e.g., 80"
              />
            </div>
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Critical threshold
              </label>
              <input
                type="number"
                value={form.critical || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, critical: Number(e.target.value) || 0 }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
                min={0}
                step={0.1}
                placeholder="e.g., 90"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Direction
              </label>
              <select
                value={form.direction || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, direction: e.target.value as any }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
              >
                <option value="above-is-worse">Higher is worse</option>
                <option value="below-is-worse">Lower is worse</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Unit
              </label>
              <select
                value={form.unit || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, unit: e.target.value as any }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
              >
                <option value="percent">%</option>
                <option value="milliseconds">ms</option>
                <option value="requests/min">req/min</option>
                <option value="errors">errors</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Recovery readings
              </label>
              <input
                type="number"
                value={form.recovery_readings || "3"}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, recovery_readings: Number(e.target.value) }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
                min={1}
              />
            </div>
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Cooldown (minutes)
              </label>
              <input
                type="number"
                value={form.cooldown_minutes || "10"}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cooldown_minutes: Number(e.target.value) }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
                min={0}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-300 mb-1 block">
              Enabled
              </label>
              <select
                value={String(form.enabled)}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, enabled: e.target.value === "true" }))
                }
                className="bg-charcoal text-white rounded py-1 px-2 text-sm"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

          <button
            type="submit"
            className="w-full bg-cyan text-charcoal py-2 rounded-md font-medium hover:bg-blue-600 transition-colors"
          >
            {form.id ? "Update Rule" : "Create Rule"}
          </button>
        </form>
      </div>

      {/* Existing rules table */}
      <div>
        {filteredRules.length === 0 ? (
          <p className="text-gray-400 py-8">
            No threshold rules configured. Create a new rule above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400">
                    Rule ID
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400">
                    Application
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400">
                    Metric
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400">
                    Warning
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400">
                    Critical
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400">
                    Direction
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400">
                    Unit
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400">
                    Enabled
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400">Actions</th>
                </tr>
              </TableHead>
              <TableBody>
                {filteredRules.map((rule: ThresholdRule) => (
                  <tr
                    key={rule.id}
                    className="border-b border-gray-700 hover:bg-navy transition-colors"
                  >
                    <td className="font-medium text-sm">
                      <span className="text-charcoal">{rule.id}</span>
                    </td>
                    <td className="text-gray-300 font-medium">
                      {rule.application_name || rule.application_id}
                    </td>
                    <td className="text-gray-300 text-sm">
                      {rule.metric}
                    </td>
                    <td className="text-sm text-charcoal">
                      {rule.warning}{rule.unit || ""}
                    </td>
                    <td className="text-sm text-charcoal">
                      {rule.critical}{rule.unit || ""}
                    </td>
                    <td>
                      <span className="text-sm text-gray-400">
                        {rule.direction}
                      </span>
                    </td>
                    <td className="text-sm text-gray-400">
                      {rule.unit}
                    </td>
                    <td>
                      <span className={
                        rule.enabled ? "text-green-400" : "text-red-400"
                      }>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <LucideButton
                        onClick={() =>
                          navigate(`/threshold-rules/${rule.id}/edit`)
                        }
                        className="text-xs text-cyan hover underline"
                      >
                        Edit
                      </LucideButton>
                      <LucideButton
                        onClick={() => handleDelete(rule.id)}
                        className="text-xs text-red-400 hover underline ml-2"
                      >
                        Delete
                      </LucideButton>
                    </td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}