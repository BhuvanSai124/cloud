import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API } from "@/utils/api";

export type TimeRange = "15m" | "1h" | "6h" | "24h" | "7d";
export type DataSourceType = "simulated" | "gcp";
export type ThemeMode = "dark" | "light";

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "info" | "warning";
}

interface AppContextValue {
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  dataSource: DataSourceType;
  setDataSource: (source: DataSourceType) => void;
  selectedEnvironment: string;
  setSelectedEnvironment: (env: string) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  refreshCount: number;
  triggerRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date;
  toasts: ToastMessage[];
  showToast: (title: string, type?: ToastMessage["type"], message?: string) => void;
  removeToast: (id: string) => void;
  switchDataSource: (newSource: DataSourceType) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const [dataSource, setDataSource] = useState<DataSourceType>("simulated");
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("Production (us-central1)");
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem("cloudpulse-theme") as ThemeMode) || "dark";
  });
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Apply theme to document
  useEffect(() => {
    localStorage.setItem("cloudpulse-theme", theme);
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }, [theme]);

  // Initial fetch of active data source from backend settings
  useEffect(() => {
    API.get("/api/settings")
      .then((cfg) => {
        if (cfg.data_source) {
          setDataSource(cfg.data_source);
        }
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const showToast = (title: string, type: ToastMessage["type"] = "info", message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setRefreshCount((c) => c + 1);
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const switchDataSource = async (newSource: DataSourceType) => {
    try {
      await API.patch("/api/settings", { data_source: newSource });
      setDataSource(newSource);
      showToast(
        `Switched to ${newSource === "gcp" ? "Live GCP Mode" : "Simulation Mode"}`,
        "success",
        newSource === "gcp"
          ? "Querying Google Cloud Monitoring APIs"
          : "Using deterministic local simulated telemetry"
      );
      triggerRefresh();
    } catch (err: any) {
      showToast("Failed to switch data source", "error", err.message);
    }
  };

  return (
    <AppContext.Provider
      value={{
        timeRange,
        setTimeRange,
        dataSource,
        setDataSource,
        selectedEnvironment,
        setSelectedEnvironment,
        theme,
        toggleTheme,
        refreshCount,
        triggerRefresh,
        isRefreshing,
        lastUpdated,
        toasts,
        showToast,
        removeToast,
        switchDataSource,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
