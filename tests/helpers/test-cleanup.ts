/**
 * Test Cleanup Helper
 * Manages resource cleanup for tests to prevent Jest from hanging
 */

import { sentimentManager } from "../../src/lib/sentiment-manager";

export class TestCleanup {
  private static instances: any[] = [];

  static registerForCleanup(instance: any): void {
    this.instances.push(instance);
  }

  static async cleanup(): Promise<void> {
    // Cleanup sentiment orchestrator instances
    try {
      if (sentimentManager && typeof sentimentManager.dispose === "function") {
        sentimentManager.dispose();
      }
    } catch {
      // Ignore cleanup errors in tests
    }

    // Cleanup any registered instances
    for (const instance of this.instances) {
      try {
        if (instance.dispose) {
          instance.dispose();
        }
        if (instance.destroy) {
          instance.destroy();
        }
        if (instance.close) {
          await instance.close();
        }
      } catch {
        // Ignore cleanup errors in tests
      }
    }

    this.instances = [];
  }

  static setupTestTimeout(): void {
    // Set a reasonable timeout for tests
    jest.setTimeout(30000);
  }
}

// Global cleanup after all tests
afterAll(async () => {
  await TestCleanup.cleanup();
});
