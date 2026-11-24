/* src/pages/ApplicationsPage.tsx */
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableBody,
  Button,
} from "@/components/ui/common";
import { Application } from "@/types/api";
import { useAppData } from "@/hooks/useAppData";
import { formatMetric, getStateReason } from "@/utils/thresholds";

export default function ApplicationsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataSource = location.state?.dataSource || "simulated";

  // Filter parameters
  const envFilter = searchParams.get("environment") || "";
  const statusFilter = searchParams.get("status") || "";

  // Fetch applications
  const [apps, setApps] = useState<Application[]>([]);
  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then(setApps)
      .catch(() => setApps([]));
  }, []);

  // Fetch latest metrics for all apps
  const [metrics, setMetrics] = useState<NormalizedMetric[] | null>(null);
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch("/api/collect");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setMetrics(data.metrics || []);
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
      }
    }
    fetchMetrics();
  }, []);

  // KPI counts
  const kpis = React.useMemo(() => {
    if (!metrics) return { healthy: 0, warning: 0, critical: 0, unknown: 0, total: 0 };
    
    const total = new Set(metrics.map((m: NormalizedMetric) => m.application_id)).size;
    const states = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
    
    metrics.forEach((m: NormalizedMetric) => {
      if (m.is_unknown()) {
        states.unknown++;
      } else {
        const value = m.value ?? 0;
        if (value < 80) states.healthy++;
        else if (value < 90) states.warning++;
        else states.critical++;
      }
    });
    
    return { ...states, total };
  }, [metrics]);

  // Filter applications
  const filteredApps = React.useMemo(() => {
    return apps.filter((app) => {
      if (envFilter && app.environment !== envFilter) return false;
      return true;
    });
  }, [apps, envFilter]);

  // Handle status filter
  const statusClassMap: Record<string, string> = {
    healthy: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    critical: "bg-red-100 text-red-800",
    unknown: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Applications</h2>

      {/* Filters */}
      <div className="mb-4 bg-charcoal rounded p-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-300 mb-1 block">
              Environment:
            </label>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.set("environment", val);
                  navigate(`?${newParams.toString()}`, { replace: true });
                } else {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.delete("environment");
                  navigate(`?${newParams.toString()}`, { replace: true });
                }
              }}
              className="bg-navy text-white rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="prod">Production</option>
              <option value="staging">Staging</option>
              <option value="dev">Development</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-300 mb-1 block">
              Status:
            </label>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.set("status", val);
                  navigate(`?${newParams.toString()}`, { replace: true });
                } else {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.delete("status");
                  navigate(`?${newParams.toString()}`, { replace: true });
                }
              }}
              className="bg-navy text-white rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Application table */}
      {apps.length === 0 ? (
        <p className="text-gray-400">
          No applications configured. Add applications from the Settings page.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-400">Application</th>
                <th className="text-left text-xs font-medium text-gray-400">Environment</th>
                <th className="text-left text-xs font-medium text-gray-400">CPU %</th>
                <th className="text-left text-xs font-medium text-gray-400">Memory %</th>
                <th className="text-left text-xs font-medium text-gray-400">Status</th>
                <th className="text-left text-xs font-medium text-gray-400">Last Updated</th>
                <th className="text-left text-xs font-medium text-gray-400">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {filteredApps.map((app) => {
                const appMetrics = (metrics || []).filter(
                  (m: NormalizedMetric) => m.application_id === app.id
                );
                const latest = appMetrics[appMetrics.length - 1];

                const cpuMetric = latest?.metrics?.find(
                  (m: NormalizedMetric) => m.metric === "cpu"
                );
                const memoryMetric = latest?.metrics?.find(
                  (m: NormalizedMetric) => m.metric === "memory"
                );
                const latencyMetric = latest?.metrics?.find(
                  (m: NormalizedMetric) => m.metric === "latency"
                );
                const errorMetric = latest?.metrics?.find(
                  (m: NormalizedMetric) => m.metric === "error_rate"
                );

                const cpu = cpuMetric?.value;
                const memory = memoryMetric?.value;
                const latency = latencyMetric?.value;
                const errorRate = errorMetric?.value;

                // Determine status
                let status = "unknown";
                let statusClass = "gray";
                if (cpu !== undefined || memory !== undefined) {
                  if (cpu >= 90 || memory >= 90) {
                    status = "critical";
                    statusClass = "red";
                  } else if (cpu >= 80 || memory >= 80) {
                    status = "warning";
                    statusClass = "amber";
                  } else {
                    status = "healthy";
                    statusClass = "green";
                  }
                }

                return (
                  <tr
                    key={app.id}
                    className="border-b border-gray-700 hover:bg-navy transition-colors"
                  >
                    <td className="font-medium">
                      <a
                        href={`/applications/{app.id}`}
                        className="text-charcoal hover:text-cyan"
                      >
                        {app.name}
                      </a>
                    </td>
                    <td className="text-gray-300">
                      {app.environment}
                    </td>
                    <td>
                      {cpu !== undefined ? (
                        <span className={`text-${statusClass} font-medium`}>
                          {cpu}%
                        </span>
                      ) : (
                        <span className="text-gray-500">No data</span>
                      )}
                    </td>
                    <td>
                      {memory !== undefined ? (
                        <span className={`text-${statusClass} font-medium`}>
                          {memory}%
                        </span>
                      ) : (
                        <span className="text-gray-500">No data</span>
                      )}
                    </td>
                    <td>
                      <span className={`text-${statusClass} font-medium`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400">
                      {latest?.timestamp
                        ? new Date(latest.timestamp).toLocaleTimeString()
                        : "Never"}
                    </td>
                    <td>
                      <Button
                        onClick={() => navigate(`/applications/${app.id}/summary`)}
                        className="text-xs text-cyan hover underline"
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}