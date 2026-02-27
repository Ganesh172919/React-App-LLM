const { logger } = require("./logger");
const { getConfig } = require("../config");

class JobQueue {
  constructor() {
    const config = getConfig();
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = config.queue.maxConcurrent;
    this.activeJobs = 0;
    this.retryAttempts = config.queue.retryAttempts;
    this.retryDelay = config.queue.retryDelay;
    this.handlers = new Map();
    this.completedJobs = [];
    this.failedJobs = [];
    this.stats = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      totalRetried: 0,
    };
  }

  registerHandler(jobType, handler) {
    this.handlers.set(jobType, handler);
    logger.info("Job handler registered", { jobType });
  }

  async enqueue(jobType, data, options = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: jobType,
      data,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.retryAttempts,
      delay: options.delay || 0,
      createdAt: new Date(),
      status: "pending",
      scheduledAt: options.delay ? new Date(Date.now() + options.delay) : new Date(),
    };

    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.stats.totalEnqueued++;

    logger.debug("Job enqueued", { jobId: job.id, jobType, priority: job.priority });

    if (!this.processing) {
      this._processQueue();
    }

    return job.id;
  }

  async _processQueue() {
    if (this.processing && this.activeJobs >= this.maxConcurrent) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeJobs < this.maxConcurrent) {
      const now = new Date();
      const jobIndex = this.queue.findIndex((j) => j.scheduledAt <= now);
      if (jobIndex === -1) break;

      const job = this.queue.splice(jobIndex, 1)[0];
      this.activeJobs++;

      this._executeJob(job)
        .then(() => {
          this.activeJobs--;
          if (this.queue.length > 0) this._processQueue();
        })
        .catch(() => {
          this.activeJobs--;
          if (this.queue.length > 0) this._processQueue();
        });
    }

    if (this.queue.length === 0 && this.activeJobs === 0) {
      this.processing = false;
    }
  }

  async _executeJob(job) {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      logger.error("No handler for job type", { jobType: job.type, jobId: job.id });
      job.status = "failed";
      job.error = `No handler registered for job type: ${job.type}`;
      this.failedJobs.push(job);
      this.stats.totalFailed++;
      return;
    }

    job.attempts++;
    job.status = "processing";
    job.startedAt = new Date();

    const timer = logger.startTimer(`Job ${job.id}`);

    try {
      job.result = await handler(job.data, job);
      job.status = "completed";
      job.completedAt = new Date();
      this.completedJobs.push(job);
      this.stats.totalProcessed++;
      timer.end({ jobId: job.id, jobType: job.type, status: "completed" });
    } catch (error) {
      logger.error("Job execution failed", {
        jobId: job.id,
        jobType: job.type,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        error,
      });

      if (job.attempts < job.maxAttempts) {
        job.status = "pending";
        job.scheduledAt = new Date(
          Date.now() + this.retryDelay * Math.pow(2, job.attempts - 1)
        );
        this.queue.push(job);
        this.stats.totalRetried++;
        logger.info("Job scheduled for retry", {
          jobId: job.id,
          attempt: job.attempts,
          nextRetryAt: job.scheduledAt,
        });
      } else {
        job.status = "failed";
        job.error = error.message;
        job.failedAt = new Date();
        this.failedJobs.push(job);
        this.stats.totalFailed++;
      }
      timer.end({ jobId: job.id, jobType: job.type, status: "failed" });
    }
  }

  getJobStatus(jobId) {
    const pending = this.queue.find((j) => j.id === jobId);
    if (pending) return { ...pending };

    const completed = this.completedJobs.find((j) => j.id === jobId);
    if (completed) return { ...completed };

    const failed = this.failedJobs.find((j) => j.id === jobId);
    if (failed) return { ...failed };

    return null;
  }

  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      activeJobs: this.activeJobs,
      completedJobs: this.completedJobs.length,
      failedJobs: this.failedJobs.length,
    };
  }

  getQueueHealth() {
    const oldestPending = this.queue[0];
    return {
      healthy: this.failedJobs.length < 100 && this.queue.length < 1000,
      queueDepth: this.queue.length,
      activeWorkers: this.activeJobs,
      maxWorkers: this.maxConcurrent,
      oldestJobAge: oldestPending
        ? Date.now() - new Date(oldestPending.createdAt).getTime()
        : 0,
      failureRate:
        this.stats.totalProcessed > 0
          ? (
              (this.stats.totalFailed /
                (this.stats.totalProcessed + this.stats.totalFailed)) *
              100
            ).toFixed(2) + "%"
          : "0%",
    };
  }

  clearCompleted() {
    const count = this.completedJobs.length;
    this.completedJobs = [];
    return count;
  }

  clearFailed() {
    const count = this.failedJobs.length;
    this.failedJobs = [];
    return count;
  }
}

const jobQueue = new JobQueue();

jobQueue.registerHandler("send_email", async (data) => {
  logger.info("Processing email job", { to: data.to, type: data.type });
});

jobQueue.registerHandler("analytics_event", async (data) => {
  logger.debug("Processing analytics event", { event: data.event });
});

jobQueue.registerHandler("cleanup_sessions", async (data) => {
  logger.info("Processing session cleanup", { olderThan: data.olderThan });
});

jobQueue.registerHandler("generate_report", async (data) => {
  logger.info("Processing report generation", { reportType: data.reportType });
});

module.exports = jobQueue;
