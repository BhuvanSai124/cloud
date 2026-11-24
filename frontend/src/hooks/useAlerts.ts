import { useEffect, useState } from "react";
import { Incident } from "@/types/api";

export function useAlerts() {
  const [alerts, setAlerts] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const response = await fetch("/api/alerts");
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setAlerts(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { alerts, isLoading };
}
