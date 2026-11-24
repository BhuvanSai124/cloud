/* src/hooks/useAppData.ts */
import { useEffect, useState } from "react";
import { NormalizedMetric } from "@/types/api";

export function useAppData(
  apps: any[],
  range: string,
  selectedApp: string | null
) {
  const [metrics, setMetrics] = useState<NormalizedMetric[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCollection, setLastCollection] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMetrics() {
      setIsLoading(true);
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append("range", range);
        if (selectedApp) {
          params.append("app_id", selectedApp);
        }

        const response = await fetch(`/api/apps/${selectedApp ? selectedApp : "all"}?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setMetrics(data.metrics || []);
        setLastCollection(data.last_collection || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchMetrics();

    // Return cleanup function
    return () => {
      cancelled = true;
    };
  }, [apps, range, selectedApp]);

  return { metrics, isLoading, error, lastCollection };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/alerts");
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        setAlerts(data || []);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAlerts();

    // Poll every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return { alerts, isLoading };
}