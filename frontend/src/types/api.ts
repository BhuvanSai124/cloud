export type MetricType =
  | "cpu"
  | "memory"
  | "request_count"
  | "latency"
  | "p95_latency"
  | "error_rate"
  | "instance_count"
  | "availability";

export type ComparisonOperator = ">" | ">=" | "<" | "<=" | "==" | "!=";
export type AlertSeverity = "info" | "warning" | "critical" | "INFO" | "WARNING" | "CRITICAL";
export type AlertState = "open" | "firing" | "pending" | "acknowledged" | "resolved";

export interface NormalizedMetric {
  id?: string;
  application_id: string;
  metric: MetricType;
  value: number | null;
  unit: string | null;
  timestamp: string;
  source: "gcp" | "simulated";
  resource_name: string;
  metadata?: Record<string, unknown>;
}

export interface ThresholdRule {
  id: string;
  name?: string;
  description?: string;
  application_id: string;
  metric: MetricType;
  operator?: ComparisonOperator;
  threshold?: number;
  warning: number;
  critical: number;
  direction: "above-is-worse" | "below-is-worse";
  unit: string;
  evaluation_window_seconds?: number;
  recovery_readings: number;
  cooldown_minutes: number;
  severity?: AlertSeverity;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  name: string;
  environment: string;
  resource_type?: string;
  resource_name?: string;
  data_source: string;
  health_status?: "healthy" | "degraded" | "critical";
  active_incidents_count?: number;
  latest_metrics?: Record<string, number | null>;
  last_metric_update?: string;
  available_metric_categories?: string[];
  created_at?: string;
  updated_at?: string;
}

export type Application = Service;

export interface IncidentEvent {
  id: string;
  alert_id?: string;
  event_type: "breach_start" | "breach_continue" | "escalation" | "acknowledge" | "recovery" | "resolution";
  timestamp: string;
  actor: string | null;
  old_value: number | null;
  new_value: number | null;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Incident {
  id: string;
  application_id: string;
  metric: string;
  rule_id?: string;
  severity: AlertSeverity;
  state: AlertState;
  current_value: number | null;
  threshold: number;
  critical_threshold?: number;
  opened_at: string;
  last_seen_at: string;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  duration?: number;
  metadata?: Record<string, unknown>;
  events?: IncidentEvent[];
}

export interface KPICardData {
  value?: number | string;
  unit?: string;
  status?: string;
  trend?: string;
  trend_delta?: number;
  healthy_count?: number;
  total_services?: number;
}

export interface OverviewData {
  kpis: {
    service_health: KPICardData;
    cpu_utilization: KPICardData;
    memory_utilization: KPICardData;
    request_rate: KPICardData;
    response_latency: KPICardData;
    error_rate: KPICardData;
    availability: KPICardData;
  };
  cpu_memory_chart: Array<{ time: string; cpu: number | null; memory: number | null }>;
  latency_chart: Array<{ time: string; p50: number | null; p95: number | null; p99: number | null }>;
  volume_error_chart: Array<{ time: string; request_count: number; error_rate: number }>;
  service_health_distribution: { healthy: number; degraded: number; critical: number };
  alert_severity_distribution: { critical: number; warning: number; info: number };
  recent_incidents: Incident[];
  total_incidents: number;
  active_incidents: number;
  total_services: number;
  time_range: string;
  data_source: "simulated" | "gcp";
  gcp_project_id?: string;
  last_updated: string;
}

export interface GcpVerificationResult {
  status: "connected" | "unconfigured" | "authentication_missing" | "permission_denied" | "api_error";
  connected: boolean;
  project_id: string;
  credentials_found: boolean;
  auth_type: string;
  api_enabled: boolean;
  permissions: string[];
  discovered_resources: Array<{
    id: string;
    name: string;
    resource_type: string;
    environment: string;
  }>;
  message: string;
  diagnostic_steps: string[];
}

export interface ConfigResponse {
  data_source: "simulated" | "gcp";
  project_id: string;
  gcp_project_id?: string;
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
}
