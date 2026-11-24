import { ThresholdRule } from "@/types/api";

/** Demo default thresholds (configurable, not production advice) */
export const cpuWarning = 80;
export const cpuCritical = 90;
export const memoryWarning = 80;
export const memoryCritical = 90;

/** Determine alert state from a threshold rule and metric value */
export function getStateFromRule(
  rule: ThresholdRule,
  value: number | null
): "healthy" | "warning" | "critical" | "unknown" {
  if (value === null || value === undefined) return "unknown";
  if (value >= rule.critical) return "critical";
  if (value >= rule.warning) return "warning";
  return "healthy";
}

/** Format a metric value with its unit for display */
export function formatMetric(value: number | null, unit: string | null): string {
  if (value === null || value === undefined) return "No data";
  if (unit === "percent") return `${value}%`;
  if (unit === "milliseconds") return `${value}ms`;
  if (unit === "requests/min" || unit === "requests/sec") return `${value} ${unit}`;
  return `${value} ${unit}`;
}

/** Get a human-readable reason for the current state */
export function getStateReason(
  rule: ThresholdRule,
  value: number | null
): string {
  if (value === null) return "No recent metric data available";

  if (value >= rule.critical) {
    return `Value ${value}${rule.unit} is at or above critical threshold ${rule.critical}${rule.unit}`;
  }
  if (value >= rule.warning) {
    return `Value ${value}${rule.unit} is at or above warning threshold ${rule.warning}${rule.unit}`;
  }
  return `Value ${value}${rule.unit} is below warning threshold ${rule.warning}${rule.unit}`;
}