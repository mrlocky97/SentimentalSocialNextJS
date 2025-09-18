/**
 * Orchestrator Provider
 * Central provider for SentimentAnalysisOrchestrator singleton access
 */

import { SentimentAnalysisOrchestrator } from "./orchestrator";

// Singleton instance
let orchestratorInstance: SentimentAnalysisOrchestrator | null = null;

/**
 * Get the singleton instance of SentimentAnalysisOrchestrator
 */
export function getOrchestrator(): SentimentAnalysisOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SentimentAnalysisOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Reset the orchestrator instance (mainly for testing)
 */
export function resetOrchestrator(): void {
  orchestratorInstance = null;
}