/**
 * Global teardown for Jest tests
 * Ensures all resources are properly cleaned up
 */

module.exports = async () => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Clear all timers
  if (global.setTimeout) {
    const timeouts = [];
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (...args) => {
      const timeout = originalSetTimeout(...args);
      timeouts.push(timeout);
      return timeout;
    };

    // Clear any remaining timeouts
    timeouts.forEach((timeout) => {
      try {
        clearTimeout(timeout);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
  }

  // Clear all intervals
  if (global.setInterval) {
    const intervals = [];
    const originalSetInterval = global.setInterval;
    global.setInterval = (...args) => {
      const interval = originalSetInterval(...args);
      intervals.push(interval);
      return interval;
    };

    // Clear any remaining intervals
    intervals.forEach((interval) => {
      try {
        clearInterval(interval);
      } catch (e) {
        // Ignore cleanup errors
      }
    });
  }

  // Give a moment for async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
};
