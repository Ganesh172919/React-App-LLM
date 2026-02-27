const { logger } = require("./logger");

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.histograms = new Map();
    this.gauges = new Map();
    this.counters = new Map();
    this.snapshots = [];
    this.maxSnapshots = 1440;

    this._snapshotInterval = setInterval(
      () => this._takeSnapshot(),
      60 * 1000
    );
  }

  startTimer(name) {
    const start = process.hrtime.bigint();
    return {
      end: () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        this._recordHistogram(name, durationMs);
        return durationMs;
      },
    };
  }

  increment(name, value = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  setGauge(name, value) {
    this.gauges.set(name, { value, timestamp: Date.now() });
  }

  _recordHistogram(name, value) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: [],
      });
    }

    const hist = this.histograms.get(name);
    hist.count++;
    hist.sum += value;
    hist.min = Math.min(hist.min, value);
    hist.max = Math.max(hist.max, value);

    hist.values.push(value);
    if (hist.values.length > 1000) {
      hist.values = hist.values.slice(-500);
    }
  }

  getHistogramStats(name) {
    const hist = this.histograms.get(name);
    if (!hist || hist.count === 0) return null;

    const sorted = [...hist.values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return {
      count: hist.count,
      mean: hist.sum / hist.count,
      min: hist.min,
      max: hist.max,
      p50,
      p95,
      p99,
    };
  }

  getMetrics() {
    const histogramMetrics = {};
    for (const [name] of this.histograms) {
      histogramMetrics[name] = this.getHistogramStats(name);
    }

    const counterMetrics = {};
    for (const [name, value] of this.counters) {
      counterMetrics[name] = value;
    }

    const gaugeMetrics = {};
    for (const [name, data] of this.gauges) {
      gaugeMetrics[name] = data;
    }

    return {
      histograms: histogramMetrics,
      counters: counterMetrics,
      gauges: gaugeMetrics,
      process: this._getProcessMetrics(),
    };
  }

  _getProcessMetrics() {
    const memUsage = process.memoryUsage();
    return {
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
      pid: process.pid,
      nodeVersion: process.version,
    };
  }

  _takeSnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      ...this._getProcessMetrics(),
      counters: Object.fromEntries(this.counters),
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-Math.floor(this.maxSnapshots / 2));
    }
  }

  getSnapshots(count = 60) {
    return this.snapshots.slice(-count);
  }

  getHealthStatus() {
    const mem = process.memoryUsage();
    const heapUsedPercent = (mem.heapUsed / mem.heapTotal) * 100;

    return {
      status: heapUsedPercent > 90 ? "degraded" : "healthy",
      uptime: process.uptime(),
      memory: {
        heapUsedPercent: heapUsedPercent.toFixed(2) + "%",
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
      activeRequests: this.gauges.get("active_requests")?.value || 0,
    };
  }

  requestMiddleware() {
    return (req, res, next) => {
      const timer = this.startTimer("http_request_duration");
      this.increment("http_requests_total");

      const currentActive = (this.gauges.get("active_requests")?.value || 0) + 1;
      this.setGauge("active_requests", currentActive);

      const originalEnd = res.end;
      res.end = (...args) => {
        timer.end();
        const nowActive = Math.max(
          0,
          (this.gauges.get("active_requests")?.value || 1) - 1
        );
        this.setGauge("active_requests", nowActive);

        this.increment(`http_status_${Math.floor(res.statusCode / 100)}xx`);
        this.increment(`http_method_${req.method.toLowerCase()}`);

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  destroy() {
    clearInterval(this._snapshotInterval);
  }
}

const performanceMonitor = new PerformanceMonitor();
module.exports = performanceMonitor;
