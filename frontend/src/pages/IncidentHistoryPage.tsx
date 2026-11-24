/* src/pages/IncidentHistoryPage.tsx */
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
import { Incident } from "@/types/api";
import { useAlerts } from "@/hooks/useAlerts";
import { formatMetric } from "@/utils/thresholds";

export default function IncidentHistoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dataSource = location.state?.dataSource || "simulated";

  // Filter parameters
  const severityFilter = searchParams.get("severity") || "";
  const stateFilter = searchParams.get("state") || "";
  const appFilter = searchParams.get("application_id") || "";

  // Fetch alerts
  const { alerts, isLoading } = useAlerts();

  // Apply filters
  const filteredAlerts = React.useMemo(() => {
    if (!alerts) return [];
    return alerts.filter((a: any) => {
      if (severityFilter && a.severity !== severityFilter) return false;
      if (stateFilter && a.state !== stateFilter) return false;
      if (appFilter && a.application_id !== appFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, stateFilter, appFilter]);

  // Sort by opened date (newest first)
  const sortedAlerts = React.useMemo(() => {
    if (!filteredAlerts) return [];
    return [...filteredAlerts].sort(
      (a: any, b: any) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
    );
  }, [filteredAlerts]);

  // Compute MTTR and stats
  const resolvedAlerts = React.useMemo(() => {
    if (!filteredAlerts) return [];
    return filteredAlerts.filter((a: any) => a.state === "resolved");
  }, [filteredAlerts]);

  const mttr = React.useMemo(() => {
    if (resolvedAlerts.length === 0) return "N/A - no resolved incidents";
    const totalDuration = resolvedAlerts.reduce(
      (sum: number, a: any) => sum + (a.duration || 0),
      0
    );
    const avgMinutes = totalDuration / resolvedAlerts.length;
    if (avgMinutes < 1) return "0m";
    if (avgMinutes < 60) {
      return `${Math.round(avgMinutes)}m`;
    }
    return `${Math.round(avgMinutes / 60)}h ${Math.round(
      (avgMinutes % 60) / 10
    )}m`;
  }, [resolvedAlerts]);

  // Status badges
  const stateBadge = (state: string) => {
    const map: Record<string, string> = {
      open: "bg-red-100 text-red-800",
      acknowledged: "bg-amber-100 text-amber-800",
      resolved: "bg-green-100 text-green-800",
    };
    return map[state] || "bg-gray-100 text-gray-800";
  };

  const severityBadge = (severity: string) => {
    const map: Record<string, string> = {
      warning: "bg-amber-100 text-amber-800",
      critical: "bg-red-100 text-red-800",
    };
    return map[severity] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Incident History
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>MTTR: {mttr}</span>
        </div>
      </h2>

      {/* Filters */}
      <div className="mb-4 bg-charcoal rounded p-3">
        <div className="grid grid-cols-4 gap-2">
          <div>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.set("severity", val);
                  navigate(`?${newParams.toString()}`, { replace: true });
                } else {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.delete("severity");
                  navigate(`?${newParams.toString()}`, { replace: true });
                }
              }}
              className="bg-navy text-white rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.set("state", val);
                  navigate(`?${newParams.toString()}`, { replace: true });
                } else {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.delete("state");
                  navigate(`?${newParams.toString()}`, { replace: true });
                }
              }}
              className="bg-navy text-white rounded px-2 py-1 text-sm"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div>
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.set("application_id", val);
                  navigate(`?${newParams.toString()}`, { replace: true });
                } else {
                  const newParams = new URLSearchParams(searchParams.toString());
                  newParams.delete("application_id");
                  navigate(`?${newParams.toString()}`, { replace: true });
                }
              }}
              className="bg-navy text-white rounded px-2 py-1 text-sm"
            >
              <option value="">All Apps</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => navigate("/demo-lab")}
              className="rounded px-3 py-1 text-sm transition-colors bg-cyan text-charcoal hover:bg-blue-600"
            >
              Reset Demo
            </button>
          </div>
        </div>
      </div>

      {/* No data state */}
      {isLoading && <p className="text-gray-400">Loading...</p>}
      {(!isLoading || sortedAlerts.length > 0) && sortedAlerts.length === 0 && (
        <p className="text-gray-400 py-8">
          No incidents found. Apply different filters or check that incidents exist.
        </p>
      )}

      {/* Incidents table */}
      {sortedAlerts && sortedAlerts.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-400">Incident ID</th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Application
                </th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Metric
                </th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Severity
                </th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Peak Value
                </th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Threshold
                </th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Opened
                </th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Resolved
                </th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Duration
                </th>
                <th className="text-left text-xs font-medium text-gray-400">
                  Acknowledgement
                </th>
                <th className="text-left text-xs font-medium text-gray-400">Actions</th>
              </tr>
            </TableHead>
            <TableBody>
              {sortedAlerts.map((alert: Incident) => {
                const events = alert.events || [];
                const openEvent = events.find(
                  (e: any) => e.event_type === "breach_start"
                );
                const ackEvent = events.find(
                  (e: any) => e.event_type === "acknowledge"
                );
                const resEvent = events.find(
                  (e: any) => e.event_type === "resolution"
                );

                const opened = openEvent
                  ? new Date(openEvent.timestamp).toLocaleString()
                  : "N/A";
                const resolved = resEvent
                  ? new Date(resEvent.timestamp).toLocaleString()
                  : "Open";
                const ackText = ackEvent
                  ? `Ack by ${ackEvent.actor || "unknown"} at ${new Date(
                      ackEvent.timestamp
                    ).toLocaleTimeString()}`
                  : "Not acknowledged";

                const duration = alert.duration
                  ? `${Math.round(alert.duration / 60)}m`
                  : alert.state === "open"
                  ? "Active"
                  : "N/A";

                const peakValue = alert.current_value
                  ? `${alert.current_value}${alert.unit || ""}`
                  : "N/A";

                const severityClass = severityBadge(alert.severity);
                const stateClass = stateBadge(alert.state);

                return (
                  <tr
                    key={alert.id}
                    className="border-b border-gray-700 hover:bg-navy transition-colors"
                  >
                    <td className="font-medium text-sm">
                      <span className="text-charcoal">{alert.id}</span>
                    </td>
                    <td className="text-gray-300 font-medium">
                      {alert.application_id}
                    </td>
                    <td className="text-gray-300 text-sm">
                      {alert.metric}
                    </td>
                    <td>
                      <span className={`text-${severityClass} font-medium`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="text-sm text-charcoal">
                      {peakValue}
                    </td>
                    <td>
                      <span className="text-sm text-gray-400">
                        {alert.threshold}{alert.unit || ""}
                      </span>
                    </td>
                    <td className="text-xs text-gray-400">{opened}</td>
                    <td className="text-xs text-gray-400">{resolved}</td>
                    <td className="text-xs text-gray-400">{duration}</td>
                    <td className="text-xs text-gray-400">{ackText}</td>
                    <td>
                      <Button
                        onClick={() =>
                          navigate(`/alerts/${alert.id}`)
                        }
                        className="text-xs text-cyan hover underline"
                      >
                        View
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