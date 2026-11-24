import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Activity,
  Cpu,
  Database,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Server,
  Zap,
  TrendingDown,
  TrendingUp,
  Filter,
} from "lucide-react";
import { API } from "@/utils/api";
import { useApp } from "@/context/AppContext";
import { OverviewData, Service, Incident } from "@/types/api";

const HEALTH_COLORS = {
  healthy: "#10b981", // Emerald
  degraded: "#f59e0b", // Amber
  critical: "#ef4444", // Rose
};

const SEVERITY_COLORS = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#06b6d4",
};

export default function OverviewPage() {
  const { timeRange, refreshCount, dataSource, theme, showToast } = useApp();
  const [data, setData] = useState<OverviewData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch overview data and service list
  useEffect(() => {
    setLoading(true);
    setError(null);

    const params: Record<string, string> = { range: timeRange };
    if (selectedService !== "all") {
      params.service_id = selectedService;
    }

    Promise.all([
      API.get<OverviewData>("/api/overview", params),
      API.get<Service[]>("/api/services"),
    ])
      .then(([overviewRes, servicesRes]) => {
        setData(overviewRes);
        setServices(servicesRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard overview telemetry");
        setLoading(false);
      });
  }, [timeRange, refreshCount, selectedService]);

  const isLight = theme === "light";

  // Service health pie data
  const healthPieData = useMemo(() => {
    if (!data?.service_health_distribution) return [];
    return [
      { name: "Healthy", value: data.service_health_distribution.healthy, color: HEALTH_COLORS.healthy },
      { name: "Degraded", value: data.service_health_distribution.degraded, color: HEALTH_COLORS.degraded },
      { name: "Critical", value: data.service_health_distribution.critical, color: HEALTH_COLORS.critical },
    ].filter((item) => item.value > 0);
  }, [data]);

  // Alert severity pie data
  const severityPieData = useMemo(() => {
    if (!data?.alert_severity_distribution) return [];
    return [
      { name: "Critical", value: data.alert_severity_distribution.critical, color: SEVERITY_COLORS.critical },
      { name: "Warning", value: data.alert_severity_distribution.warning, color: SEVERITY_COLORS.warning },
      { name: "Info", value: data.alert_severity_distribution.info, color: SEVERITY_COLORS.info },
    ].filter((item) => item.value > 0);
  }, [data]);

  // Handle quick incident acknowledge
  const handleAcknowledge = async (incidentId: string) => {
    try {
      await API.post(`/api/incidents/${incidentId}/acknowledge`, { actor: "sre-console@cloudpulse.io" });
      showToast("Incident Acknowledged", "success", `Incident ${incidentId} marked as acknowledged.`);
      // Refresh
      const overviewRes = await API.get<OverviewData>("/api/overview", { range: timeRange });
      setData(overviewRes);
    } catch (err: any) {
      showToast("Failed to acknowledge", "error", err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800/40 rounded w-1/4" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-800/40 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-800/40 rounded-2xl" />
          <div className="h-80 bg-slate-800/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-400" />
          <div>
            <h3 className="font-semibold text-lg">Failed to load monitoring overview</h3>
            <p className="text-sm text-rose-400/80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Header section with Service Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry aggregation across cloud resources ({timeRange} window)
          </p>
        </div>

        {/* Service Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className={`text-xs rounded-lg px-3 py-1.5 border font-medium transition-colors ${
              isLight
                ? "bg-white border-slate-300 text-slate-700"
                : "bg-slate-900 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Services ({services.length})</option>
            {services.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.name} ({svc.environment})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 7 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* 1. Overall Health */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Service Health</span>
            <Server className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="my-2">
            <span
              className={`text-lg font-bold tracking-tight ${
                kpis?.service_health?.status === "Healthy"
                  ? "text-emerald-400"
                  : kpis?.service_health?.status === "Degraded"
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {kpis?.service_health?.status || "Healthy"}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            {kpis?.service_health?.healthy_count}/{kpis?.service_health?.total_services} nominal
          </div>
        </div>

        {/* 2. CPU Utilization */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CPU Load</span>
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tight">
              {kpis?.cpu_utilization?.value ?? "--"}
            </span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            <span>-1.4% vs prev</span>
          </div>
        </div>

        {/* 3. Memory Utilization */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Memory Load</span>
            <Database className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tight">
              {kpis?.memory_utilization?.value ?? "--"}
            </span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span>+0.8% vs prev</span>
          </div>
        </div>

        {/* 4. Request Rate */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Throughput</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tight">
              {kpis?.request_rate?.value ? kpis.request_rate.value.toLocaleString() : "--"}
            </span>
            <span className="text-[10px] text-slate-400">req/min</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span>+5.2% traffic</span>
          </div>
        </div>

        {/* 5. Latency */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Latency</span>
            <Clock className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tight">
              {kpis?.response_latency?.value ?? "--"}
            </span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-400">p95: ~180ms</div>
        </div>

        {/* 6. Error Rate */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>5xx Errors</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span
              className={`text-lg font-bold tracking-tight ${
                (kpis?.error_rate?.value ?? 0) > 2 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {kpis?.error_rate?.value ?? "--"}
            </span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[11px] text-slate-400">&lt; 1% SLO target</div>
        </div>

        {/* 7. Availability */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Availability</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-lg font-bold tracking-tight text-emerald-400">
              {kpis?.availability?.value ?? "99.98"}
            </span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[11px] text-slate-400">Target: 99.9%</div>
        </div>
      </div>

      {/* Row 1 Charts: Chart A (CPU & Memory) & Chart B (Latency Trend) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: CPU & Memory over Time */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#161e2e]/90 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">A. CPU & Memory Utilization</h3>
              <p className="text-[11px] text-slate-400">Normalized percentage consumption</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> CPU
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Memory
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.cpu_memory_chart || []}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1f293d"} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? "#ffffff" : "#0f172a",
                    borderColor: isLight ? "#e2e8f0" : "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
                <Area type="monotone" dataKey="memory" name="Memory (%)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#memGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Request Latency Trend (p50, p95, p99) */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#161e2e]/90 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">B. Response Latency Percentiles</h3>
              <p className="text-[11px] text-slate-400">p50, p95, and p99 response duration</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> p50
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> p95
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> p99
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.latency_chart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1f293d"} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? "#ffffff" : "#0f172a",
                    borderColor: isLight ? "#e2e8f0" : "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="p50" name="p50 (Median)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95" name="p95" stroke="#818cf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" name="p99" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Chart C (Volume & Errors) & Charts D & E (Distributions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart C: Request Volume & Error Rate (Composed) */}
        <div
          className={`lg:col-span-2 p-5 rounded-2xl border transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#161e2e]/90 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">C. Request Volume & Error Rate</h3>
              <p className="text-[11px] text-slate-400">Total requests (bars) vs HTTP 5xx error percentage (line)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" /> Requests
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Error Rate (%)
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.volume_error_chart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1f293d"} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? "#ffffff" : "#0f172a",
                    borderColor: isLight ? "#e2e8f0" : "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Bar yAxisId="left" dataKey="request_count" name="Requests" fill="#0891b2" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Line yAxisId="right" type="monotone" dataKey="error_rate" name="Error Rate (%)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts D & E: Service Health & Alert Severity Distributions */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
            isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#161e2e]/90 border-slate-800"
          }`}
        >
          <div>
            <h3 className="font-semibold text-sm">D & E. Health & Severity Distributions</h3>
            <p className="text-[11px] text-slate-400 mb-4">Cluster posture & active incident severities</p>

            <div className="grid grid-cols-2 gap-4">
              {/* Donut D: Service Health */}
              <div className="text-center">
                <div className="text-xs font-medium text-slate-400 mb-1">Services</div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthPieData}
                        innerRadius={28}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {healthPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] font-semibold text-emerald-400">
                  {data?.service_health_distribution.healthy} Healthy
                </div>
              </div>

              {/* Donut E: Alert Severity */}
              <div className="text-center">
                <div className="text-xs font-medium text-slate-400 mb-1">Alerts</div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityPieData.length > 0 ? severityPieData : [{ name: "None", value: 1, color: "#334155" }]}
                        innerRadius={28}
                        outerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {(severityPieData.length > 0 ? severityPieData : [{ name: "None", value: 1, color: "#334155" }]).map((entry, index) => (
                          <Cell key={`cell-sev-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[11px] font-semibold text-rose-400">
                  {data?.alert_severity_distribution.critical} Critical
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs flex justify-between text-slate-400">
            <span>Active Incidents: {data?.active_incidents}</span>
            <Link to="/incidents" className="text-cyan-400 hover:underline">
              View All Incidents →
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Chart F. Recent Incidents & Event Timeline */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#161e2e]/90 border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm">F. Recent Incidents & Event Timeline</h3>
            <p className="text-[11px] text-slate-400">Audit trail of breached thresholds and incident state transitions</p>
          </div>
          <Link
            to="/incidents"
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            Incident Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data?.recent_incidents && data.recent_incidents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Metric Condition</th>
                  <th className="py-2.5 px-3">Triggered Value</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Last Seen</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {data.recent_incidents.slice(0, 6).map((inc) => {
                  const isCrit = inc.severity.toLowerCase() === "critical";
                  const isOpen = inc.state === "firing" || inc.state === "open";
                  return (
                    <tr key={inc.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-3">
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
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {inc.application_id}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {inc.metric} &gt; {inc.threshold}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-100">
                        {inc.current_value ?? "--"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                            inc.state === "resolved"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                              : inc.state === "acknowledged"
                              ? "bg-blue-950/60 text-blue-400 border border-blue-800/60"
                              : "bg-rose-950/60 text-rose-400 border border-rose-800/60 animate-pulse"
                          }`}
                        >
                          {inc.state}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(inc.last_seen_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isOpen && (
                          <button
                            onClick={() => handleAcknowledge(inc.id)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors font-medium border border-cyan-500/30"
                          >
                            Acknowledge
                          </button>
                        )}
                        <Link
                          to={`/incidents?id=${inc.id}`}
                          className="ml-2 text-xs text-slate-400 hover:text-white underline"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            No active incidents. All system thresholds are operating within healthy parameters.
          </div>
        )}
      </div>
    </div>
  );
}