export interface ServiceHealthStatus {
  service: string;
  endpoint: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  lastChecked: string;
  details?: Record<string, any>;
}

export interface ApiHealthReport {
  timestamp: string;
  uptimeSeconds: number;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  services: ServiceHealthStatus[];
  memoryUsageMb: number;
}

