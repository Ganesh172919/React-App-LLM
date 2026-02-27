const performanceMonitor = require("../services/performanceMonitor");

describe("Performance Monitor", () => {
  test("startTimer measures duration", () => {
    const timer = performanceMonitor.startTimer("test_operation");
    const duration = timer.end();
    expect(typeof duration).toBe("number");
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  test("increment increases counter", () => {
    performanceMonitor.increment("test_counter");
    performanceMonitor.increment("test_counter");
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.counters.test_counter).toBe(2);
  });

  test("setGauge sets a gauge value", () => {
    performanceMonitor.setGauge("active_connections", 42);
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.gauges.active_connections.value).toBe(42);
  });

  test("getHistogramStats returns percentile data", () => {
    for (let i = 0; i < 100; i++) {
      const timer = performanceMonitor.startTimer("histogram_test");
      timer.end();
    }
    const stats = performanceMonitor.getHistogramStats("histogram_test");
    expect(stats).toBeDefined();
    expect(stats.count).toBe(100);
    expect(stats.mean).toBeGreaterThanOrEqual(0);
    expect(stats.p50).toBeDefined();
    expect(stats.p95).toBeDefined();
    expect(stats.p99).toBeDefined();
  });

  test("getMetrics returns complete metrics", () => {
    const metrics = performanceMonitor.getMetrics();
    expect(metrics.histograms).toBeDefined();
    expect(metrics.counters).toBeDefined();
    expect(metrics.gauges).toBeDefined();
    expect(metrics.process).toBeDefined();
    expect(metrics.process.uptime).toBeGreaterThan(0);
    expect(metrics.process.memory).toBeDefined();
  });

  test("getHealthStatus returns health info", () => {
    const health = performanceMonitor.getHealthStatus();
    expect(health.status).toBeDefined();
    expect(health.uptime).toBeGreaterThan(0);
    expect(health.memory).toBeDefined();
    expect(health.memory.heapUsedPercent).toBeDefined();
  });

  test("requestMiddleware returns a function", () => {
    const middleware = performanceMonitor.requestMiddleware();
    expect(typeof middleware).toBe("function");
  });
});
