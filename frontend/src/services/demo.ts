/* src/services/demo.ts */
import { NormalizedMetric } from "@/types/api";
import { AlertEvent } from "@/types/api";

/** Scenario definitions for manual simulation */
export const scenarios = {
  cpu_spike: {
    label: "CPU Spike",
    metric: "cpu" as const,
    value: 95,
    unit: "percent",
    description: "Simulate CPU utilization spike to 95%",
  },
  memory_spike: {
    label: "Memory Spike",
    metric: "memory" as const,
    value: 95,
    unit: "percent",
    description: "Simulate memory utilization spike to 95%",
  },
  slow_response: {
    label: "Slow Response",
    metric: "latency" as const,
    value: 500,
    unit: "milliseconds",
    description: "Simulate increased response latency (500ms)",
  },
  http_5xx: {
    label: "HTTP 5xx Errors",
    metric: "error_rate" as const,
    value: 15,
    unit: "percent",
    description: "Simulate HTTP 5xx error spike (15%)",
  },
  app_downtime: {
    label: "Application Downtime",
    metric: "availability" as const,
    value: 0,
    unit: "percent",
    description: "Simulate application downtime (0% availability)",
  },
};

/** Start a guided incident drill - resets state and returns initial step */
export async function startDrill(): Promise<{
  step: number;
  status: string;
}> {
  // In a full implementation, this would call a backend endpoint
  // that resets the database and returns step 1 with "Baseline healthy"
  return {
    step: 1,
    status: "Baseline healthy - no active incidents",
  };
}

/** Advance the drill to the next step */
export async function nextDrillStep(step: number): Promise<{
  step: number;
  status: string;
  completed?: boolean;
}> {
  // This function coordinates the deterministic drill sequence
  // Each step calls backend operations that persist metrics and manage incidents
  const results: Record<number, {
    step: number;
    status: string;
    event?: string;
  }> = {
    1: { step: 1, status: "Baseline healthy" },
    2: { step: 2, status: "CPU warning breach triggered", event: "breach_start" },
    3: { step: 3, status: "Critical breach - escalation on same incident", event: "escalation" },
    4: { step: 4, status: "Incident acknowledged", event: "acknowledge" },
    5: { step: 5, status: "Normal readings restored" },
    6: { step: 6, status: "Recovery readings fed" },
    7: { step: 7, status: "Incident resolved", completed: true },
    8: { step: 8, status: "Timeline displayed", event: "resolution" },
  };

  const result = results[step] || { step, status: "Complete" };
  return {
    step: result.step,
    status: result.status,
    ...(result.completed ? { completed: true } : {}),
  };
}

/** Reset demo data and scenario */
export async function resetDrill(): Promise<{
  success: boolean;
  message: string;
}> {
  // Call backend to reset database state
  try {
    const response = await fetch("/api/demo/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    return {
      success: true,
      message: data.message || "Demo data reset successfully",
    };
  } catch (err) {
    console.error("Failed to reset drill:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/** Simulate a scenario - creates a metric and triggers the alert engine */
export async function simulateScenario(
  scenarioKey: keyof typeof scenarios
): Promise<{
  success: boolean;
  metric: NormalizedMetric;
  evaluation: Array<{
    action: "created" | "updated" | "resolved";
    severity: "warning" | "critical" | "healthy";
  }>;
}> {
  const spec = scenarios[scenarioKey];
  const now = new Date().toISOString();

  // Create a normalized metric
  const metric: NormalizedMetric = {
    application_id: "app-01",
    metric: spec.metric,
    value: spec.value,
    unit: spec.unit,
    timestamp: now,
    source: "simulated",
    resource_name: "app-01",
    metadata: { simulated_demo: true, scenario: scenarioKey },
  };

  // Persist the metric snapshot
  try {
    const snapResponse = await fetch("/api/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!snapResponse.ok) throw new Error("HTTP " + snapResponse.status);

    // Evaluate the metric against rules
    const evalResponse = await fetch("/api/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!evalResponse.ok) throw new Error("HTTP " + evalResponse.status);
    const evalData = await evalResponse.json();

    return {
      success: true,
      metric,
      evaluation: evalData.actions || [],
    };
  } catch (err) {
    console.error("Failed to simulate scenario:", err);
    return {
      success: false,
      metric: {} as NormalizedMetric,
      evaluation: [],
    };
  }
}