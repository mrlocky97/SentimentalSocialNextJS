/**
 * Reactive Services Orchestrator
 * Central orchestration system for all reactive services
 */

import { Observable, Subject, BehaviorSubject, combineLatest, merge, timer } from 'rxjs';
import {
  map,
  filter,
  switchMap,
  catchError,
  tap,
  shareReplay,
  startWith,
  distinctUntilChanged,
} from 'rxjs/operators';

// Import reactive services
import { reactiveTwitterScraper } from './twitter-scraper-reactive.wrapper';
import { reactiveSentimentAnalyzer } from './sentiment-analysis-reactive.wrapper';
import { notificationSystem } from './notification-system';
import { autoOptimizationSystem } from './auto-optimization-system';
import { predictiveAnalyticsSystem } from './predictive-analytics-system';

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  uptime: number;
  lastActivity: Date;
  performance: {
    responseTime: number;
    successRate: number;
    throughput: number;
  };
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceStatus[];
  timestamp: Date;
  alerts: string[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  service: string;
  action: string;
  inputs: any;
  outputs?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
}

export interface OrchestratorStats {
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  systemUptime: number;
  averageWorkflowTime: number;
  servicesOnline: number;
  totalServices: number;
}

class ReactiveServicesOrchestrator {
  private workflows$ = new BehaviorSubject<Map<string, Workflow>>(new Map());
  private systemHealth$ = new BehaviorSubject<SystemHealth>({
    overall: 'healthy',
    services: [],
    timestamp: new Date(),
    alerts: [],
  });
  private stats$ = new BehaviorSubject<OrchestratorStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    completedWorkflows: 0,
    failedWorkflows: 0,
    systemUptime: 0,
    averageWorkflowTime: 0,
    servicesOnline: 0,
    totalServices: 5,
  });

  private readonly startTime = Date.now();
  private healthCheckInterval = 30000; // 30 seconds

  constructor() {
    this.initializeHealthMonitoring();
    this.initializeStatsTracking();
  }

  /**
   * Initialize health monitoring
   */
  private initializeHealthMonitoring(): void {
    timer(0, this.healthCheckInterval)
      .pipe(
        switchMap(() => this.checkSystemHealth()),
        tap((health) => this.handleHealthStatus(health))
      )
      .subscribe((health) => this.systemHealth$.next(health));
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStatsTracking(): void {
    combineLatest([
      this.workflows$,
      timer(0, 10000), // Every 10 seconds
    ])
      .pipe(map(([workflows]) => this.calculateStats(workflows)))
      .subscribe((stats) => this.stats$.next(stats));
  }

  /**
   * Create and execute workflow
   */
  createWorkflow(
    name: string,
    description: string,
    steps: Omit<WorkflowStep, 'id' | 'status'>[]
  ): Observable<Workflow> {
    const workflow: Workflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      steps: steps.map((step, index) => ({
        ...step,
        id: `step_${index + 1}`,
        status: 'pending',
      })),
      status: 'pending',
      progress: 0,
    };

    // Add to workflows
    const current = this.workflows$.value;
    current.set(workflow.id, workflow);
    this.workflows$.next(current);

    // Execute workflow
    return this.executeWorkflow(workflow.id);
  }

  /**
   * Execute workflow by ID
   */
  executeWorkflow(workflowId: string): Observable<Workflow> {
    const workflow = this.workflows$.value.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    return new Observable<Workflow>((subscriber) => {
      this.runWorkflow(workflow)
        .then((result) => {
          subscriber.next(result);
          subscriber.complete();
        })
        .catch((error) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * Create social media optimization workflow
   */
  createOptimizationWorkflow(campaignId: string, data: any): Observable<Workflow> {
    const steps: Omit<WorkflowStep, 'id' | 'status'>[] = [
      {
        name: 'Scrape Twitter Data',
        service: 'twitter-scraper',
        action: 'batchScrape',
        inputs: { queries: data.hashtags, priority: 'high' },
      },
      {
        name: 'Analyze Sentiment',
        service: 'sentiment-analysis',
        action: 'analyzeBatch',
        inputs: { texts: [] }, // Will be populated from previous step
      },
      {
        name: 'Predict Engagement',
        service: 'predictive-analytics',
        action: 'predict',
        inputs: { type: 'engagement', campaignId, data },
      },
      {
        name: 'Generate Optimization',
        service: 'auto-optimization',
        action: 'scheduleOptimization',
        inputs: { type: 'hashtag_optimization', campaignId, data },
      },
      {
        name: 'Send Notification',
        service: 'notification',
        action: 'notify',
        inputs: {
          type: 'success',
          title: 'Optimization Complete',
          message: `Campaign ${campaignId} optimization workflow completed`,
        },
      },
    ];

    return this.createWorkflow(
      'Social Media Optimization',
      `Complete optimization workflow for campaign ${campaignId}`,
      steps
    );
  }

  /**
   * Get system health
   */
  getSystemHealth(): Observable<SystemHealth> {
    return this.systemHealth$.asObservable();
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): Observable<OrchestratorStats> {
    return this.stats$.asObservable();
  }

  /**
   * Get all workflows
   */
  getWorkflows(): Observable<Workflow[]> {
    return this.workflows$.pipe(map((workflowMap) => Array.from(workflowMap.values())));
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(id: string): Observable<Workflow | undefined> {
    return this.workflows$.pipe(map((workflows) => workflows.get(id)));
  }

  /**
   * Run workflow execution
   */
  private async runWorkflow(workflow: Workflow): Promise<Workflow> {
    const workflows = this.workflows$.value;

    // Start workflow
    workflow.status = 'running';
    workflow.startedAt = new Date();
    workflows.set(workflow.id, workflow);
    this.workflows$.next(workflows);

    notificationSystem.notify({
      type: 'info',
      title: 'Workflow Started',
      message: `Workflow "${workflow.name}" is now running`,
      data: { workflowId: workflow.id },
      priority: 'medium',
    });

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepStartTime = Date.now();

        // Update step status
        step.status = 'running';
        workflow.progress = (i / workflow.steps.length) * 100;
        workflows.set(workflow.id, workflow);
        this.workflows$.next(workflows);

        // Execute step
        const result = await this.executeStep(step, workflow);

        // Update step completion
        step.status = result.success ? 'completed' : 'failed';
        step.outputs = result.outputs;
        step.duration = Date.now() - stepStartTime;

        if (!result.success) {
          throw new Error(`Step "${step.name}" failed: ${result.error}`);
        }
      }

      // Workflow completed successfully
      workflow.status = 'completed';
      workflow.progress = 100;
      workflow.completedAt = new Date();

      notificationSystem.sendSuccess(
        'Workflow Completed',
        `Workflow "${workflow.name}" completed successfully`,
        { workflowId: workflow.id }
      );
    } catch (error: any) {
      // Workflow failed
      workflow.status = 'failed';
      workflow.completedAt = new Date();

      notificationSystem.sendError(
        'Workflow Failed',
        `Workflow "${workflow.name}" failed: ${error.message}`,
        { workflowId: workflow.id, error: error.message }
      );
    }

    workflows.set(workflow.id, workflow);
    this.workflows$.next(workflows);
    return workflow;
  }

  /**
   * Execute individual workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    workflow: Workflow
  ): Promise<{ success: boolean; outputs?: any; error?: string }> {
    try {
      let result: any;

      switch (step.service) {
        case 'twitter-scraper':
          result = await this.executeTwitterScraperStep(step);
          break;
        case 'sentiment-analysis':
          result = await this.executeSentimentAnalysisStep(step);
          break;
        case 'predictive-analytics':
          result = await this.executePredictiveAnalyticsStep(step);
          break;
        case 'auto-optimization':
          result = await this.executeAutoOptimizationStep(step);
          break;
        case 'notification':
          result = await this.executeNotificationStep(step);
          break;
        default:
          throw new Error(`Unknown service: ${step.service}`);
      }

      return { success: true, outputs: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute Twitter scraper step
   */
  private async executeTwitterScraperStep(step: WorkflowStep): Promise<any> {
    const { action, inputs } = step;

    switch (action) {
      case 'batchScrape':
        return new Promise((resolve, reject) => {
          reactiveTwitterScraper
            .batchScrape(inputs.queries, inputs.options || {}, inputs.priority)
            .subscribe({
              next: (result: any) => resolve(result),
              error: (error: any) => reject(error),
            });
        });
      default:
        throw new Error(`Unknown Twitter scraper action: ${action}`);
    }
  }

  /**
   * Execute sentiment analysis step
   */
  private async executeSentimentAnalysisStep(step: WorkflowStep): Promise<any> {
    const { action, inputs } = step;

    switch (action) {
      case 'analyzeBatch':
        // Convert text strings to Tweet objects for the wrapper
        const tweets = (inputs.texts || ['Sample text for analysis']).map(
          (text: string, index: number) => ({
            id: `temp_${index}`,
            text,
            user: 'temp_user',
            created_at: new Date().toISOString(),
            retweet_count: 0,
            favorite_count: 0,
          })
        );

        return new Promise((resolve, reject) => {
          reactiveSentimentAnalyzer.analyzeTweetsBatch(tweets).subscribe({
            next: (result: any) => resolve(result),
            error: (error: any) => reject(error),
          });
        });
      default:
        throw new Error(`Unknown sentiment analysis action: ${action}`);
    }
  }

  /**
   * Execute predictive analytics step
   */
  private async executePredictiveAnalyticsStep(step: WorkflowStep): Promise<any> {
    const { action, inputs } = step;

    switch (action) {
      case 'predict':
        return new Promise((resolve, reject) => {
          predictiveAnalyticsSystem.predict(inputs.type, inputs.campaignId, inputs.data).subscribe({
            next: (result: any) => resolve(result),
            error: (error: any) => reject(error),
          });
        });
      default:
        throw new Error(`Unknown predictive analytics action: ${action}`);
    }
  }

  /**
   * Execute auto optimization step
   */
  private async executeAutoOptimizationStep(step: WorkflowStep): Promise<any> {
    const { action, inputs } = step;

    switch (action) {
      case 'scheduleOptimization':
        return new Promise((resolve, reject) => {
          autoOptimizationSystem
            .scheduleOptimization(inputs.type, inputs.campaignId, inputs.data, inputs.priority)
            .subscribe({
              next: (result: any) => resolve(result),
              error: (error: any) => reject(error),
            });
        });
      default:
        throw new Error(`Unknown auto optimization action: ${action}`);
    }
  }

  /**
   * Execute notification step
   */
  private async executeNotificationStep(step: WorkflowStep): Promise<any> {
    const { action, inputs } = step;

    switch (action) {
      case 'notify':
        notificationSystem.notify(inputs);
        return { sent: true };
      default:
        throw new Error(`Unknown notification action: ${action}`);
    }
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(): Promise<SystemHealth> {
    const services: ServiceStatus[] = [
      await this.checkServiceHealth('Twitter Scraper', reactiveTwitterScraper),
      await this.checkServiceHealth('Sentiment Analysis', reactiveSentimentAnalyzer),
      await this.checkServiceHealth('Notification System', notificationSystem),
      await this.checkServiceHealth('Auto Optimization', autoOptimizationSystem),
      await this.checkServiceHealth('Predictive Analytics', predictiveAnalyticsSystem),
    ];

    const healthyServices = services.filter((s) => s.status === 'healthy').length;
    const warningServices = services.filter((s) => s.status === 'warning').length;
    const errorServices = services.filter((s) => s.status === 'error').length;

    let overall: SystemHealth['overall'];
    if (errorServices > 0) {
      overall = 'critical';
    } else if (warningServices > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const alerts: string[] = [];
    if (errorServices > 0) {
      alerts.push(`${errorServices} service(s) offline`);
    }
    if (warningServices > 0) {
      alerts.push(`${warningServices} service(s) experiencing issues`);
    }

    return {
      overall,
      services,
      timestamp: new Date(),
      alerts,
    };
  }

  /**
   * Check individual service health
   */
  private async checkServiceHealth(name: string, service: any): Promise<ServiceStatus> {
    // Simulate health check
    await this.delay(100);

    const isHealthy = Math.random() > 0.1; // 90% healthy
    const responseTime = Math.random() * 100 + 50; // 50-150ms

    return {
      name,
      status: isHealthy ? 'healthy' : 'warning',
      uptime: Date.now() - this.startTime,
      lastActivity: new Date(),
      performance: {
        responseTime,
        successRate: Math.random() * 0.1 + 0.9, // 90-100%
        throughput: Math.random() * 100 + 50, // 50-150 ops/min
      },
    };
  }

  /**
   * Handle health status changes
   */
  private handleHealthStatus(health: SystemHealth): void {
    const current = this.stats$.value;

    this.stats$.next({
      ...current,
      servicesOnline: health.services.filter((s) => s.status === 'healthy').length,
      systemUptime: Date.now() - this.startTime,
    });
  }

  /**
   * Calculate orchestrator statistics
   */
  private calculateStats(workflows: Map<string, Workflow>): OrchestratorStats {
    const workflowArray = Array.from(workflows.values());
    const completed = workflowArray.filter((w) => w.status === 'completed');
    const failed = workflowArray.filter((w) => w.status === 'failed');
    const active = workflowArray.filter((w) => w.status === 'running' || w.status === 'pending');

    const avgTime =
      completed.length > 0
        ? completed.reduce((sum, w) => {
            const duration =
              w.completedAt && w.startedAt ? w.completedAt.getTime() - w.startedAt.getTime() : 0;
            return sum + duration;
          }, 0) / completed.length
        : 0;

    const current = this.stats$.value;

    return {
      totalWorkflows: workflowArray.length,
      activeWorkflows: active.length,
      completedWorkflows: completed.length,
      failedWorkflows: failed.length,
      systemUptime: Date.now() - this.startTime,
      averageWorkflowTime: avgTime,
      servicesOnline: current.servicesOnline,
      totalServices: current.totalServices,
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  shutdown(): void {
    this.workflows$.complete();
    this.systemHealth$.complete();
    this.stats$.complete();
  }
}

// Export singleton instance
export const reactiveOrchestrator = new ReactiveServicesOrchestrator();
