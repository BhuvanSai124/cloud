import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Check,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  X,
  User,
  Activity,
} from "lucide-react";
import { API } from "@/utils/api";
import { useApp } from "@/context/AppContext";
import { Incident, AlertSeverity, AlertState } from "@/types/api";

export default function AlertsPage() {
  const { refreshCount, theme, showToast } = useApp();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  // Selected incident for detail modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form states for Acknowledge / Resolve dialogs
  const [acknowledgeActor, setAcknowledgeActor] = useState<string>("sre-engineer@cloudpulse.io");
  const [acknowledgeNote, setAcknowledgeNote] = useState<string>("");
  const [resolveActor, setResolveActor] = useState<string>("sre-engineer@cloudpulse.io");
  const [resolveReason, setResolveReason] = useState<string>("Root cause mitigated and workload verified stable");
  const [showAckModal, setShowAckModal] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);

  // Load incidents
  const loadIncidents = async () => {
    setLoading(true);
    try {
      const res = await API.get<Incident[]>("/api/incidents");
      setIncidents(res);
      if (queryId) {
        const found = res.find((i) => i.id === queryId);
        if (found) {
          openDetail(found);
        }
      }
    } catch (err: any) {
      showToast("Failed to load incidents", "error", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [refreshCount, queryId]);

  const openDetail = async (incident: Incident) => {
    try {
      const detail = await API.get<Incident>(`/api/incidents/${incident.id}`);
      setSelectedIncident(detail);
      setIsDetailOpen(true);
    } catch {
      setSelectedIncident(incident);
      setIsDetailOpen(true);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedIncident) return;
    setActionLoading(true);
    try {
      await API.post(`/api/incidents/${selectedIncident.id}/acknowledge`, {
        actor: acknowledgeActor,
        note: acknowledgeNote || undefined,
      });
      showToast("Incident Acknowledged", "success", `Incident ${selectedIncident.id} acknowledged by ${acknowledgeActor}`);
      setShowAckModal(false);
      // Reload detail & list
      await openDetail(selectedIncident);
      await loadIncidents();
    } catch (err: any) {
      showToast("Acknowledgement failed", "error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedIncident) return;
    setActionLoading(true);
    try {
      await API.post(`/api/incidents/${selectedIncident.id}/resolve`, {
        actor: resolveActor,
        reason: resolveReason,
      });
      showToast("Incident Resolved", "success", `Incident marked as resolved.`);
      setShowResolveModal(false);
      // Reload detail & list
      await openDetail(selectedIncident);
      await loadIncidents();
    } catch (err: any) {
      showToast("Resolution failed", "error", err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const isLight = theme === "light";

  // Distinct service IDs
  const serviceOptions = useMemo(() => {
    return Array.from(new Set(incidents.map((i) => i.application_id)));
  }, [incidents]);

  // Filtered list
  const filtered = incidents.filter((i) => {
    const matchesSearch =
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.application_id.toLowerCase().includes(search.toLowerCase()) ||
      i.metric.toLowerCase().includes(search.toLowerCase());
    const matchesSev =
      severityFilter === "all" || i.severity.toLowerCase() === severityFilter.toLowerCase();
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "open" && (i.state === "firing" || i.state === "open" || i.state === "pending")) ||
      i.state.toLowerCase() === statusFilter.toLowerCase();
    const matchesSvc = serviceFilter === "all" || i.application_id === serviceFilter;
    return matchesSearch && matchesSev && matchesStatus && matchesSvc;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts & Incidents</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time breach detection, sustained condition tracking, and incident lifecycle audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
            {incidents.filter((i) => i.state !== "resolved").length} Active Incidents
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
        }`}
      >
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search incident ID, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-800"
                : "bg-slate-800/80 border-slate-700 text-slate-100"
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className={`text-xs rounded-lg px-3 py-1.5 border font-medium ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-700"
                : "bg-slate-800 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`text-xs rounded-lg px-3 py-1.5 border font-medium ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-700"
                : "bg-slate-800 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="open">Firing / Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Service filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className={`text-xs rounded-lg px-3 py-1.5 border font-medium ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-700"
                : "bg-slate-800 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Services</option>
            {serviceOptions.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
          isLight ? "bg-white border-slate-200" : "bg-[#161e2e]/90 border-slate-800"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`text-[11px] uppercase tracking-wider border-b ${
                isLight
                  ? "bg-slate-50 text-slate-600 border-slate-200"
                  : "bg-slate-900/80 text-slate-400 border-slate-800"
              }`}
            >
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Breach Condition</th>
                <th className="py-3 px-4">Triggered Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Opened (UTC)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filtered.map((inc) => {
                const isCrit = inc.severity.toLowerCase() === "critical";
                const isOpen = inc.state === "firing" || inc.state === "open";
                const isAck = inc.state === "acknowledged";
                const isRes = inc.state === "resolved";

                return (
                  <tr
                    key={inc.id}
                    onClick={() => openDetail(inc)}
                    className="hover:bg-cyan-500/5 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCrit
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-300 truncate max-w-[120px]">
                      {inc.id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-100">{inc.application_id}</td>
                    <td className="py-3.5 px-4 font-mono text-cyan-400">
                      {inc.metric} &gt; {inc.threshold}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {inc.current_value ?? "--"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${
                          isRes
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                            : isAck
                            ? "bg-blue-950/60 text-blue-400 border border-blue-800"
                            : "bg-rose-950/60 text-rose-400 border border-rose-800 animate-pulse"
                        }`}
                      >
                        {inc.state}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(inc.opened_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(inc);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors font-medium border border-cyan-500/30"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !loading && (
          <div className="py-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            No incidents match the selected filter criteria.
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {isDetailOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-2xl p-6 overflow-y-auto flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200" : "bg-[#0d1424] border-slate-800"
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>{selectedIncident.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {selectedIncident.severity}
                      </span>
                    </h2>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Service: <span className="font-semibold text-slate-200">{selectedIncident.application_id}</span> •
                      Metric: <span className="font-mono text-cyan-400">{selectedIncident.metric}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Action Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="text-slate-400 text-[11px]">Current Status</div>
                  <div className="font-bold text-slate-200 capitalize mt-0.5">{selectedIncident.state}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="text-slate-400 text-[11px]">Breached Value</div>
                  <div className="font-bold text-rose-400 font-mono mt-0.5">{selectedIncident.current_value}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="text-slate-400 text-[11px]">Warning Threshold</div>
                  <div className="font-bold text-amber-400 font-mono mt-0.5">{selectedIncident.threshold}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="text-slate-400 text-[11px]">Duration</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {selectedIncident.duration ? `${selectedIncident.duration}s` : "Ongoing"}
                  </div>
                </div>
              </div>

              {/* Acknowledgement Metadata if present */}
              {selectedIncident.acknowledged_by && (
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-200 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span>Acknowledged by <strong>{selectedIncident.acknowledged_by}</strong></span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {selectedIncident.acknowledged_at
                      ? new Date(selectedIncident.acknowledged_at).toLocaleTimeString()
                      : ""}
                  </span>
                </div>
              )}

              {/* Audit Event Timeline */}
              <div className="mt-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Audit Event Timeline ({selectedIncident.events?.length || 0})
                </h4>

                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-800">
                  {selectedIncident.events?.map((ev) => (
                    <div key={ev.id} className="relative flex items-start gap-4 text-xs pl-7">
                      <span className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-slate-900" />
                      <div className="flex-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                        <div className="flex items-center justify-between font-semibold text-slate-200">
                          <span className="uppercase tracking-wider text-[10px] text-cyan-400 font-mono">
                            {ev.event_type}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-300 mt-1">{ev.message}</p>
                        {ev.actor && (
                          <div className="text-[10px] text-slate-500 mt-1">Actor: {ev.actor}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-5 mt-6 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedIncident.state !== "resolved" && (
                  <>
                    {selectedIncident.state !== "acknowledged" && (
                      <button
                        onClick={() => setShowAckModal(true)}
                        className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold border border-cyan-500/40"
                      >
                        Acknowledge Incident
                      </button>
                    )}
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold shadow-md shadow-emerald-600/20"
                    >
                      Resolve Incident
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acknowledge Confirmation Dialog */}
      {showAckModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-100">Acknowledge Incident</h3>
            <p className="text-xs text-slate-400">
              Acknowledging signifies that an engineer is actively investigating this alert. The incident state will change to Acknowledged.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Responding Engineer</label>
              <input
                type="text"
                value={acknowledgeActor}
                onChange={(e) => setAcknowledgeActor(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Investigation Note (Optional)</label>
              <textarea
                value={acknowledgeNote}
                onChange={(e) => setAcknowledgeNote(e.target.value)}
                rows={2}
                placeholder="e.g., Checking pod memory allocation and load balancing..."
                className="w-full text-xs rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAckModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAcknowledge}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500"
              >
                {actionLoading ? "Saving..." : "Confirm Acknowledged"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Confirmation Dialog */}
      {showResolveModal && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-100">Resolve Incident</h3>
            <p className="text-xs text-slate-400">
              Resolving closes this incident and calculates final duration. The incident will be marked as Resolved.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Resolving Engineer</label>
              <input
                type="text"
                value={resolveActor}
                onChange={(e) => setResolveActor(e.target.value)}
                className="w-full text-xs rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Resolution Summary</label>
              <textarea
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                rows={2}
                className="w-full text-xs rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
              >
                {actionLoading ? "Resolving..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}