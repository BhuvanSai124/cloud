import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Cpu,
  Database,
  Search,
  ExternalLink,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { API } from "@/utils/api";
import { useApp } from "@/context/AppContext";
import { Service, Incident, ThresholdRule } from "@/types/api";

export default function ServicesPage() {
  const { refreshCount, dataSource, theme, showToast } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  // Selected service for detailed modal drawer
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceDetails, setServiceDetails] = useState<{
    latest_metrics: any[];
    open_incidents: Incident[];
    rules: ThresholdRule[];
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    API.get<Service[]>("/api/services")
      .then((res) => {
        setServices(res);
        setLoading(false);
      })
      .catch((err) => {
        showToast("Failed to load services", "error", err.message);
        setLoading(false);
      });
  }, [refreshCount]);

  const loadServiceDetails = async (service: Service) => {
    setSelectedService(service);
    setDetailsLoading(true);
    try {
      const details = await API.get(`/api/services/${service.id}`);
      setServiceDetails(details);
    } catch (err: any) {
      showToast("Error loading service details", "error", err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const isLight = theme === "light";

  // Filtered services list
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase());
    const matchesEnv = envFilter === "all" || s.environment === envFilter;
    const matchesHealth = healthFilter === "all" || s.health_status === healthFilter;
    return matchesSearch && matchesEnv && matchesHealth;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Inventory</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitored application workloads, resource types, and real-time health postures
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
            {services.length} Monitored Services
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-3 items-center justify-between ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
        }`}
      >
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search service name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-800"
                : "bg-slate-800/80 border-slate-700 text-slate-100"
            }`}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className={`text-xs rounded-lg px-3 py-1.5 border font-medium ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-700"
                : "bg-slate-800/80 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Environments</option>
            <option value="prod">Production</option>
            <option value="staging">Staging</option>
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className={`text-xs rounded-lg px-3 py-1.5 border font-medium ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-700"
                : "bg-slate-800/80 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.map((svc) => {
          const isHealthy = svc.health_status === "healthy";
          const isDegraded = svc.health_status === "degraded";
          const isCritical = svc.health_status === "critical";

          const cpu = svc.latest_metrics?.cpu ?? 45.0;
          const memory = svc.latest_metrics?.memory ?? 52.0;

          return (
            <div
              key={svc.id}
              onClick={() => loadServiceDetails(svc)}
              className={`p-5 rounded-2xl border cursor-pointer hover:border-cyan-500/50 hover:shadow-lg transition-all ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#161e2e]/90 border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                      isHealthy
                        ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
                        : isDegraded
                        ? "bg-amber-600/30 text-amber-400 border border-amber-500/30"
                        : "bg-rose-600/30 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-2">
                      {svc.name}
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {svc.id}
                      </span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="capitalize font-medium text-slate-300">{svc.environment}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-cyan-400">
                        {svc.resource_type || "cloud_run_revision"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Health Badge */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      isHealthy
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                        : isDegraded
                        ? "bg-amber-950/60 text-amber-400 border border-amber-800"
                        : "bg-rose-950/60 text-rose-400 border border-rose-800 animate-pulse"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {svc.health_status || "Healthy"}
                  </span>
                  {svc.active_incidents_count ? (
                    <div className="text-[11px] text-rose-400 font-medium mt-1">
                      {svc.active_incidents_count} active incident{svc.active_incidents_count > 1 ? "s" : ""}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Resource Path & Identifier */}
              <div className="mt-3.5 pt-3 border-t border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
                <span className="truncate max-w-[260px] font-mono text-[11px]">
                  {svc.resource_name || `projects/cloudpulse/locations/us-central1/services/${svc.name.toLowerCase()}`}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  {svc.last_metric_update
                    ? new Date(svc.last_metric_update).toLocaleTimeString()
                    : "Live"}
                </span>
              </div>

              {/* Gauges Preview */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/40 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>CPU</span>
                    <span className="font-bold text-slate-200">{cpu}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cpu >= 90 ? "bg-rose-500" : cpu >= 80 ? "bg-amber-500" : "bg-cyan-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, cpu))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 text-[11px] mb-1">
                    <span>Memory</span>
                    <span className="font-bold text-slate-200">{memory}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        memory >= 90 ? "bg-rose-500" : memory >= 80 ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, memory))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServices.length === 0 && !loading && (
        <div className="text-center py-12 rounded-2xl border border-slate-800 p-8">
          <Server className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-slate-300">No Services Match Filters</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting all environments.</p>
        </div>
      )}

      {/* Service Details Drawer / Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div
            className={`w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto border-l flex flex-col justify-between ${
              isLight ? "bg-white border-slate-200" : "bg-[#0d1424] border-slate-800"
            }`}
          >
            <div>
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">{selectedService.name}</h2>
                    <div className="text-xs text-slate-400 font-mono">{selectedService.id}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 gap-3 my-5 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Environment</div>
                  <div className="font-semibold text-slate-200 mt-0.5 capitalize">
                    {selectedService.environment}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Resource Type</div>
                  <div className="font-semibold text-cyan-400 mt-0.5 font-mono text-[11px]">
                    {selectedService.resource_type || "cloud_run_revision"}
                  </div>
                </div>
              </div>

              {/* Active Alerts for this service */}
              <div className="my-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Active Alerts ({serviceDetails?.open_incidents?.length || 0})
                </h4>
                {serviceDetails?.open_incidents && serviceDetails.open_incidents.length > 0 ? (
                  <div className="space-y-2">
                    {serviceDetails.open_incidents.map((inc) => (
                      <div
                        key={inc.id}
                        className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-rose-300">
                            {inc.metric} Breach: {inc.current_value} (threshold {inc.threshold})
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Triggered {new Date(inc.opened_at).toLocaleTimeString()}
                          </div>
                        </div>
                        <Link
                          to={`/incidents?id=${inc.id}`}
                          className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-medium"
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>No active incidents. Workload is healthy.</span>
                  </div>
                )}
              </div>

              {/* Threshold Rules Attached */}
              <div className="my-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Attached Rules ({serviceDetails?.rules?.length || 0})
                </h4>
                <div className="space-y-2">
                  {serviceDetails?.rules?.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-slate-200">{rule.name || rule.metric}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {rule.metric} {rule.operator || ">"} {rule.threshold || rule.warning} {rule.unit}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {rule.severity || "Warning"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedService(null)}
                className="w-full py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold text-xs transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
