import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./layouts/App";
import OverviewPage from "./pages/OverviewPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import AlertsPage from "./pages/AlertsPage";
import IncidentHistoryPage from "./pages/IncidentHistoryPage";
import ThresholdRulesPage from "./pages/ThresholdRulesPage";
import DemoLabPage from "./pages/DemoLabPage";
import SettingsPage from "./pages/SettingsPage";
import GCPComparisonPage from "./pages/GCPComparisonPage";
import SLOPage from "./pages/SLOPage";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="alerts/:id" element={<AlertsPage />} />
          <Route path="incident-history" element={<IncidentHistoryPage />} />
          <Route path="threshold-rules" element={<ThresholdRulesPage />} />
          <Route path="demo-lab" element={<DemoLabPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="gcp-comparison" element={<GCPComparisonPage />} />
          <Route path="slo" element={<SLOPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);