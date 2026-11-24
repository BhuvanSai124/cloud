#!/usr/bin/env python
"""Setup CloudPulse frontend with Vite + React + TypeScript."""

import subprocess
import sys
import os

base = r"C:\Users\sai\OneDrive\Desktop\Cloud mini"
frontend_dir = os.path.join(base, "frontend")

print(f"Working in: {frontend_dir}")

# Step 1: Create Vite project if not already done
if not os.path.exists(os.path.join(frontend_dir, "package.json")):
    print("Creating Vite + React + TypeScript project...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "vite", "react", "react-dom", "typescript"],
        capture_output=True, text=True
    )
    print("Pip install:", result.returncode)

    # Initialize vite project
    result = subprocess.run(
        ["npm", "create", "vite@latest", ".", "--", "--template", "react-ts"],
        cwd=frontend_dir,
        capture_output=True, text=True
    )
    print("Vite create:", result.returncode[:500] if result.stdout else "err", result.stderr[:500] if result.stderr else "")
else:
    print("Vite project already exists")

# Step 2: Install dependencies
print("\nInstalling npm dependencies...")
result = subprocess.run(
    ["npm", "install"],
    cwd=frontend_dir,
    capture_output=True, text=True
)
print("npm install stdout:", result.stdout[:1000])
print("npm install stderr:", result.stderr[:1000])
print("npm install RC:", result.returncode)

# Step 3: Install Tailwind CSS and dependencies
print("\nInstalling Tailwind CSS and plugins...")
result = subprocess.run(
    ["npm", "install", "-D", "tailwindcss", "postcss", "autoprefixer", "lucide-react"],
    cwd=frontend_dir,
    capture_output=True, text=True
)
print("Tailwind install stdout:", result.stdout[:500])
print("Tailwind install stderr:", result.stderr[:500])

# Step 4: Initialize Tailwind CSS config
print("\nInitializing Tailwind CSS config...")
result = subprocess.run(
    ["npx", "tailwindcss", "init", "-p"],
    cwd=frontend_dir,
    capture_output=True, text=True
)
print("Tailwind init:", result.stdout[:500] if result.stdout else "err", result.stderr[:500] if result.stderr else "")

# Step 5: Configure Tailwind CSS (tailwind.config.cjs and postcss.config.cjs)
# We'll write the config files

tailwind_config = """/** @type {import('tailwindcss').module} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#1a1a1a",
        navy: "#0d1117",
        cyan: "#00d4ff",
        blue: "#3b82f6",
        amber: "#f59e0b",
        red: "#ef4444",
        green: "#10b981",
        gray: "#6b7280",
        border: "#1e293b",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
"""

postcss_config = """module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"""

index_html_content = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="CloudPulse - Cloud Application Monitoring Dashboard" />
    <title>CloudPulse</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
"""

# Write configs
with open(os.path.join(frontend_dir, "tailwind.config.cjs"), "w") as f:
    f.write(tailwind_config)

with open(os.path.join(frontend_dir, "postcss.config.cjs"), "w") as f:
    f.write(postcss_config)

with open(os.path.join(frontend_dir, "index.html"), "w") as f:
    f.write(index_html_content)

print("\nConfigs written")

# Step 6: Update src/index.css to include Tailwind directives
css_content = """@tailwind base;
@tailwind components;
@tailwind utilities;
"""

os.makedirs(os.path.join(frontend_dir, "src"), exist_ok=True)
with open(os.path.join(frontend_dir, "src", "index.css"), "w") as f:
    f.write(css_content)

print("CSS written")

# Step 7: Update src/main.tsx to use Tailwind and set up app shell
main_tsx = """import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, Routes } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider fallback={<App/>}>
      <Routes>
        <route path="/" element={<App/>} />
        <route path="/overview" element={<OverviewPage/>} />
        <route path="/applications" element={<ApplicationsPage/>} />
        <route path="/alerts" element={<AlertsPage/>} />
        <route path="/incident-history" element={<IncidentHistoryPage/>} />
        <route path="/threshold-rules" element={<ThresholdRulesPage/>} />
        <route path="/demo-lab" element={<DemoLabPage/>} />
        <route path="/settings" element={<SettingsPage/>} />
        <route path="/gcp-comparison" element={<GCPComparisonPage/>} />
        <route path="/slo" element={<SLOPage/>} />
      </Routes>
    </RouterProvider>
  </React.StrictMode>
);
"""

os.makedirs(os.path.join(frontend_dir, "src"), exist_ok=True)
with open(os.path.join(frontend_dir, "src", "main.tsx"), "w") as f:
    f.write(main_tsx)

print("main.tsx written")

# Step 8: Create the App shell component
app_react = """import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";

const sidebarLinks = [
  { path: "/overview", label: "Overview" },
  { path: "/applications", label: "Applications" },
  { path: "/alerts", label: "Alerts" },
  { path: "/incident-history", label: "Incident History" },
  { path: "/threshold-rules", label: "Threshold Rules" },
  { path: "/demo-lab", label: "Demo Lab" },
  { path: "/settings", label: "Settings & Integrations" },
  { path: "/gcp-comparison", label: "GCP Comparison" },
  { path: "/slo", label: "SLO / Availability" },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* Status strip */}
      <header className="border-b border-gray-600 bg-charcoal py-2">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">CloudPulse</span>
            <span className="text-sm text-gray-400">v0.1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">
              {location.state?.dataSource || "simulated"}
            </span>
            <span className="text-xs text-gray-400">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4">
        <nav className="bg-charcoal min-h-screen p-4 flex flex-col">
          <div className="mb-6">
            <Menu className="w-6 h-6 text-cyan" />
            <span className="ml-2 text-lg font-semibold">CloudPulse</span>
          </div>
          <ul className="space-y-2 px-2">
            {sidebarLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? "bg-cyan text-charcoal"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                  onClick={handleClick}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="mt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
"""

os.makedirs(os.path.join(frontend_dir, "src", "layouts"), exist_ok=True)
with open(os.path.join(frontend_dir, "src", "layouts", "App.tsx"), "w") as f:
    f.write(app_react)

print("App.tsx written")

# Step 9: Create type declarations for the API client
types_ts = """import axios, { AxiosResponse } from "axios";

export interface NormalizedMetric {
  application_id: string;
  metric: "cpu" | "memory" | "request_count" | "latency" | "p95_latency" | "error_rate" | "instance_count" | "availability";
  value: number | null;
  unit: string | null;
  timestamp: string;
  source: "gcp" | "simulated";
  resource_name: string;
  metadata?: Record<string, unknown>;
}

export interface ThresholdRule {
  id: string;
  application_id: string;
  metric: "cpu" | "memory" | "request_count" | "latency" | "p95_latency" | "error_rate" | "instance_count" | "availability";
  warning: number;
  critical: number;
  direction: "above-is-worse" | "below-is-worse";
  unit: string;
  enabled: boolean;
  recovery_readings: number;
  cooldown_minutes: number;
}

export interface Application {
  id: string;
  name: string;
  environment: string;
  resource_type?: string;
  resource_name?: string;
  data_source: string;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  application_id: string;
  metric: string;
  severity: "warning" | "critical";
  state: "open" | "acknowledged" | "resolved";
  current_value: number | null;
  threshold: number;
  critical_threshold: number;
  opened_at: string;
  last_seen_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  duration?: number;
  events: IncidentEvent[];
}

export interface IncidentEvent {
  id: string;
  event_type: "breach_start" | "breach_continue" | "escalation" | "acknowledge" | "recovery" | "resolution";
  timestamp: string;
  actor: string | null;
  old_value: number | null;
  new_value: number | null;
  message: string;
}

export interface CollectionResult {
  collection_timestamp: string;
  source: string;
  metrics_fetched: number;
  rules_evaluated: number;
  actions: Record<string, number>;
  duration_seconds: number;
}

export interface ConfigResponse {
  data_source: string;
  project_id: string;
  collection_interval_seconds: number;
  notification_cooldown_minutes: number;
  recovery_readings_count: number;
  frontend_origin: string;
  demo_thresholds: {
    cpu_warning: number;
    cpu_critical: number;
    memory_warning: number;
    memory_critical: number;
  };
  scheduler_enabled: boolean;
}
"""

os.makedirs(os.path.join(frontend_dir, "src", "types"), exist_ok=True)
with open(os.path.join(frontend_dir, "src", "types", "api.ts"), "w") as f:
    f.write(types_ts)

print("API types written")

print("\n=== Frontend setup complete! ===")
print(f"Frontend directory: {frontend_dir}")
print("Next steps:")
print("  1. cd frontend && npm run dev")
print("  2. In another terminal, cd backend && uvicorn app.main:app --reload")
print("  3. Open http://localhost:5173")