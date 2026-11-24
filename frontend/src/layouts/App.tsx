import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Activity,
  Server,
  BarChart3,
  AlertTriangle,
  Sliders,
  Cloud,
  Settings,
  FlaskConical,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  ChevronDown,
  User,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useApp, TimeRange, DataSourceType } from "@/context/AppContext";
import { ToastContainer } from "@/components/ui/Toast";

const sidebarLinks = [
  { path: "/overview", label: "Overview", icon: Activity, exact: true },
  { path: "/services", label: "Services", icon: Server },
  { path: "/metrics", label: "Metrics", icon: BarChart3 },
  { path: "/incidents", label: "Alerts & Incidents", icon: AlertTriangle },
  { path: "/alert-rules", label: "Alert Rules", icon: Sliders },
  { path: "/cloud-connections", label: "Cloud Connections", icon: Cloud },
  { path: "/settings", label: "Settings", icon: Settings },
];

const secondaryLinks = [
  { path: "/demo-lab", label: "Simulation Lab", icon: FlaskConical },
  { path: "/slo", label: "SLO & Reliability", icon: CheckCircle2 },
];

export default function App() {
  const location = useLocation();
  const {
    timeRange,
    setTimeRange,
    dataSource,
    switchDataSource,
    selectedEnvironment,
    setSelectedEnvironment,
    theme,
    toggleTheme,
    triggerRefresh,
    isRefreshing,
    lastUpdated,
  } = useApp();

  const [timeAgo, setTimeAgo] = useState<string>("just now");
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      if (seconds < 10) setTimeAgo("just now");
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    };
    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const timeRanges: TimeRange[] = ["15m", "1h", "6h", "24h", "7d"];
  const environments = [
    "Production (us-central1)",
    "Staging (us-east1)",
    "Simulated Cluster (Local)",
  ];

  const isLight = theme === "light";

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isLight ? "bg-slate-50 text-slate-800" : "bg-[#0a0f1d] text-slate-100"
      }`}
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 px-5 py-2.5 border-b backdrop-blur-md transition-colors ${
          isLight
            ? "bg-white/90 border-slate-200 shadow-sm"
            : "bg-[#111827]/90 border-slate-800/80 shadow-md shadow-black/20"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/overview" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  CloudPulse
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Observability
                </span>
              </div>
            </Link>

            {/* Environment / Project Selector Dropdown */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setEnvDropdownOpen(!envDropdownOpen)}
                className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                  isLight
                    ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="max-w-[140px] truncate">{selectedEnvironment}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {envDropdownOpen && (
                <div
                  className={`absolute left-0 mt-1 w-56 rounded-xl border shadow-xl py-1 z-50 text-xs ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-700"
                      : "bg-[#161e2e] border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="px-3 py-1.5 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">
                    Target Environment
                  </div>
                  {environments.map((env) => (
                    <button
                      key={env}
                      onClick={() => {
                        setSelectedEnvironment(env);
                        setEnvDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors ${
                        selectedEnvironment === env ? "font-semibold text-cyan-400" : ""
                      }`}
                    >
                      <span>{env}</span>
                      {selectedEnvironment === env && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Mode Indicator & Switcher */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                dataSource === "gcp"
                  ? "bg-indigo-950/60 border-indigo-700/60 text-indigo-300 shadow-sm shadow-indigo-500/10"
                  : "bg-emerald-950/60 border-emerald-700/60 text-emerald-300 shadow-sm shadow-emerald-500/10"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  dataSource === "gcp" ? "bg-indigo-400" : "bg-emerald-400"
                }`}
              />
              <span>{dataSource === "gcp" ? "Live GCP Mode" : "Simulation Mode"}</span>
              <button
                onClick={() => switchDataSource(dataSource === "gcp" ? "simulated" : "gcp")}
                className="ml-1 text-[10px] underline hover:text-white transition-colors cursor-pointer"
                title="Toggle between Simulation Mode and Live GCP Mode"
              >
                Switch
              </button>
            </div>
          </div>

          {/* Right Controls: Time Range, Refresh, Theme, Profile */}
          <div className="flex items-center gap-2.5">
            {/* Time Range Selector */}
            <div
              className={`hidden sm:flex items-center p-0.5 rounded-lg border text-xs ${
                isLight ? "bg-slate-100 border-slate-300" : "bg-slate-900 border-slate-800"
              }`}
            >
              {timeRanges.map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    timeRange === r
                      ? isLight
                        ? "bg-white text-cyan-700 shadow-sm font-semibold"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={triggerRefresh}
              disabled={isRefreshing}
              className={`p-1.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs ${
                isLight
                  ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title="Refresh Dashboard Data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`}
              />
              <span className="hidden lg:inline text-[11px] text-slate-400">{timeAgo}</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border transition-all ${
                isLight
                  ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={`Switch to ${isLight ? "Dark" : "Light"} Mode`}
            >
              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>

            {/* User Avatar Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border ${
                  isLight
                    ? "bg-slate-200 text-slate-700 border-slate-300"
                    : "bg-slate-800 text-slate-200 border-slate-700"
                }`}
                title="Account Settings"
              >
                <User className="w-3.5 h-3.5" />
              </button>

              {userMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-52 rounded-xl border shadow-xl p-3 z-50 text-xs ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-700"
                      : "bg-[#161e2e] border-slate-800 text-slate-200"
                  }`}
                >
                  <div className="font-semibold text-slate-200">SRE Operations Lead</div>
                  <div className="text-[11px] text-slate-400">admin@cloudpulse.io</div>
                  <div className="my-2 border-t border-slate-700/50" />
                  <div className="flex items-center gap-2 text-emerald-400 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Role: Cluster Administrator</span>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="mt-2 block w-full py-1 text-center rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                  >
                    Manage Settings
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body: Persistent Sidebar + Page Content */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-6">
        {/* Persistent Sidebar */}
        <aside className="w-full md:w-60 shrink-0">
          <nav
            className={`border rounded-2xl p-3 sticky top-20 shadow-sm transition-colors ${
              isLight ? "bg-white border-slate-200" : "bg-[#111827]/80 border-slate-800/90"
            }`}
          >
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2 flex items-center justify-between">
              <span>Main Monitor</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
            <ul className="space-y-1">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  location.pathname === link.path ||
                  (link.path === "/overview" && (location.pathname === "/" || location.pathname === ""));
                return (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? isLight
                            ? "bg-cyan-50 text-cyan-700 font-semibold border border-cyan-200 shadow-sm"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-medium"
                          : isLight
                          ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Diagnostic & Lab Tools */}
            <div className="mt-4 pt-3 border-t border-slate-800/60">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">
                Tools & SLOs
              </div>
              <ul className="space-y-1">
                {secondaryLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path;
                  return (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? isLight
                              ? "bg-cyan-50 text-cyan-700 font-semibold border border-cyan-200"
                              : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                            : isLight
                            ? "text-slate-600 hover:bg-slate-100"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Quick Simulation Banner in Sidebar */}
            <div
              className={`mt-4 p-3 rounded-xl border text-xs ${
                dataSource === "simulated"
                  ? "bg-cyan-950/30 border-cyan-800/40 text-cyan-300"
                  : "bg-indigo-950/30 border-indigo-800/40 text-indigo-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>{dataSource === "simulated" ? "Simulation Engine" : "Cloud Monitoring"}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {dataSource === "simulated"
                  ? "7 scenarios ready to simulate spikes, latency, and recovery."
                  : "Streaming live GCP metrics via Cloud Monitoring APIs."}
              </p>
              <Link
                to={dataSource === "simulated" ? "/demo-lab" : "/cloud-connections"}
                className="mt-2 inline-block text-[11px] font-medium text-cyan-400 hover:underline"
              >
                {dataSource === "simulated" ? "Open Demo Lab →" : "Verify GCP →"}
              </Link>
            </div>
          </nav>
        </aside>

        {/* Page Content Viewport */}
        <main
          className={`flex-1 min-w-0 border rounded-2xl p-5 md:p-7 shadow-sm transition-colors ${
            isLight ? "bg-white border-slate-200" : "bg-[#111827]/70 border-slate-800/90"
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
}