import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  Clock,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { API } from "@/utils/api";
import { useApp } from "@/context/AppContext";
import { NormalizedMetric, MetricType, Service } from "@/types/api";

const METRIC_LABELS: Record<MetricType, { label: string; unit: string; color: string }> = {
  cpu: { label: "CPU Utilization", unit: "%", color: "#f59e0b" },
  memory: { label: "Memory Utilization", unit: "%", color: "#3b82f6" },
  request_count: { label: "Request Throughput", unit: "req/min", color: "#06b6d4" },
  latency: { label: "Response Latency", unit: "ms", color: "#8b5cf6" },
  p95_latency: { label: "p95 Latency", unit: "ms", color: "#ec4899" },
  error_rate: { label: "HTTP Error Rate", unit: "%", color: "#ef4444" },
  instance_count: { label: "Instance Count", unit: "instances", color: "#10b981" },
  availability: { label: "Availability Uptime", unit: "%", color: "#14b8a6" },
};

export default function MetricsPage() {
  const { timeRange, refreshCount, dataSource, theme, showToast } = useApp();
  const [metrics, setMetrics] = useState<NormalizedMetric[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>("app-01");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("cpu");
  const [loading, setLoading] = useState<boolean>(true);
  const [isCollecting, setIsCollecting] = useState<boolean>(false);

  useEffect(() => {
    API.get<Service[]>("/api/services")
      .then((res) => {
        setServices(res);
        if (res.length > 0 && !selectedService) {
          setSelectedService(res[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    API.get<{ metrics: NormalizedMetric[] }>("/api/metrics", {
      service_id: selectedService,
      metric: selectedMetric,
      limit: 150,
    })
      .then((res) => {
        setMetrics(res.metrics || []);
        setLoading(false);
      })
      .catch((err) => {
        showToast("Error fetching metrics", "error", err.message);
        setLoading(false);
      });
  }, [selectedService, selectedMetric, timeRange, refreshCount]);

  const handleManualCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await API.post("/api/collect");
      showToast(
        "Metric Collection Complete",
        "success",
        `Collected ${res.metrics_collected} telemetry points.`
      );
      // Reload
      const updated = await API.get<{ metrics: NormalizedMetric[] }>("/api/metrics", {
        service_id: selectedService,
        metric: selectedMetric,
        limit: 150,
      });
      setMetrics(updated.metrics || []);
    } catch (err: any) {
      showToast("Collection tick failed", "error", err.message);
    } finally {
      setIsCollecting(false);
    }
  };

  const isLight = theme === "light";
  const currentMetricMeta = METRIC_LABELS[selectedMetric] || {
    label: selectedMetric,
    unit: "",
    color: "#06b6d4",
  };

  // Format chart data (chronological)
  const chartData = [...metrics]
    .reverse()
    .map((m) => {
      const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return {
        time: timeStr,
        value: m.value,
        timestamp: m.timestamp,
      };
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metrics Explorer</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Granular time series telemetry, sampling windows, and raw telemetry inspection
          </p>
        </div>

        <button
          onClick={handleManualCollect}
          disabled={isCollecting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isCollecting ? "animate-spin" : ""}`} />
          <span>{isCollecting ? "Collecting..." : "Trigger Metric Tick"}</span>
        </button>
      </div>

      {/* Selectors Bar */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap gap-4 items-center justify-between ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Select Service
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className={`text-xs rounded-lg px-3 py-1.5 border font-medium ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-800"
                  : "bg-slate-800 border-slate-700 text-slate-100"
              }`}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Metric Category
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
              className={`text-xs rounded-lg px-3 py-1.5 border font-medium ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-800"
                  : "bg-slate-800 border-slate-700 text-slate-100"
              }`}
            >
              {Object.entries(METRIC_LABELS).map(([k, meta]) => (
                <option key={k} value={k}>
                  {meta.label} ({meta.unit})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-slate-200">{metrics.length}</span> samples
        </div>
      </div>

      {/* Chart Section */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#161e2e]/90 border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentMetricMeta.color }}
              />
              {currentMetricMeta.label}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Workload {selectedService} • Units in {currentMetricMeta.unit}
            </p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
            Source: {dataSource.toUpperCase()}
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1f293d"} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                unit={currentMetricMeta.unit ? ` ${currentMetricMeta.unit}` : ""}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isLight ? "#ffffff" : "#0f172a",
                  borderColor: isLight ? "#e2e8f0" : "#334155",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={currentMetricMeta.label}
                stroke={currentMetricMeta.color}
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabular Snapshot Explorer */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#161e2e]/90 border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm">Raw Metric Sample Log</h3>
            <p className="text-[11px] text-slate-400">Persistent time series records in SQLite</p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800/80 sticky top-0 bg-[#161e2e]">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3">Recorded Value</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Data Source</th>
                <th className="py-2.5 px-3">Resource Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {metrics.slice(0, 50).map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 font-mono text-[11px]">
                  <td className="py-2.5 px-3 text-slate-400">
                    {new Date(m.timestamp).toISOString()}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400 font-semibold">{m.application_id}</td>
                  <td className="py-2.5 px-3 text-slate-300">{m.metric}</td>
                  <td className="py-2.5 px-3 font-bold text-white">{m.value ?? "null"}</td>
                  <td className="py-2.5 px-3 text-slate-400">{m.unit}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase bg-slate-800 text-slate-300">
                      {m.source}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 truncate max-w-[180px]">
                    {m.resource_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
