export interface Workflow {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  startedAt?: number;
  endedAt?: number;
  context?: Record<string, unknown>;
}
export interface ServiceHealth {
  name: string;
  online: boolean;
  latencyMs: number;
  errorRate: number;
}
export interface OrchestratorStats {
  totalWorkflows: number; activeWorkflows: number; completedWorkflows: number;
  failedWorkflows: number; systemUptime: number; averageWorkflowTime: number;
  servicesOnline: number; totalServices: number;
}
