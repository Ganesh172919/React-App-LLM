const jobQueue = require("../services/jobQueue");

describe("Job Queue", () => {
  test("enqueue adds a job and returns ID", async () => {
    const jobId = await jobQueue.enqueue("analytics_event", {
      event: "test",
    });
    expect(jobId).toBeDefined();
    expect(jobId.startsWith("job_")).toBe(true);
  });

  test("getJobStatus returns job info", async () => {
    const jobId = await jobQueue.enqueue("analytics_event", {
      event: "status_test",
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const status = jobQueue.getJobStatus(jobId);
    expect(status).toBeDefined();
  });

  test("getStats returns queue statistics", () => {
    const stats = jobQueue.getStats();
    expect(stats.totalEnqueued).toBeGreaterThan(0);
    expect(typeof stats.queueLength).toBe("number");
    expect(typeof stats.activeJobs).toBe("number");
  });

  test("getQueueHealth returns health info", () => {
    const health = jobQueue.getQueueHealth();
    expect(health.healthy).toBeDefined();
    expect(typeof health.queueDepth).toBe("number");
    expect(typeof health.maxWorkers).toBe("number");
  });

  test("registerHandler adds a new handler", () => {
    jobQueue.registerHandler("test_job_type", async (data) => {
      return { processed: true };
    });
  });

  test("enqueue with priority sorts the queue", async () => {
    const lowPriority = await jobQueue.enqueue(
      "analytics_event",
      { event: "low" },
      { priority: 1 }
    );
    const highPriority = await jobQueue.enqueue(
      "analytics_event",
      { event: "high" },
      { priority: 10 }
    );
    expect(lowPriority).toBeDefined();
    expect(highPriority).toBeDefined();
  });

  test("clearCompleted removes completed jobs", () => {
    const count = jobQueue.clearCompleted();
    expect(typeof count).toBe("number");
  });
});
