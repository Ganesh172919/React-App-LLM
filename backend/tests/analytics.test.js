const analyticsEngine = require("../services/analytics");

describe("Analytics Engine", () => {
  test("track creates an event", () => {
    const eventId = analyticsEngine.track("test_event", "user1", {
      key: "value",
    });
    expect(eventId).toBeDefined();
    expect(eventId.startsWith("evt_")).toBe(true);
  });

  test("getTopEvents returns top events", () => {
    analyticsEngine.track("message_sent", "user1");
    analyticsEngine.track("message_sent", "user2");
    analyticsEngine.track("api_call", "user1");

    const topEvents = analyticsEngine.getTopEvents(5);
    expect(Array.isArray(topEvents)).toBe(true);
    expect(topEvents.length).toBeGreaterThan(0);
    expect(topEvents[0].event).toBeDefined();
    expect(topEvents[0].count).toBeGreaterThan(0);
  });

  test("getUserJourney returns user events", () => {
    analyticsEngine.track("login", "user_journey");
    analyticsEngine.track("message_sent", "user_journey");

    const journey = analyticsEngine.getUserJourney("user_journey");
    expect(Array.isArray(journey)).toBe(true);
    expect(journey.length).toBeGreaterThanOrEqual(2);
  });

  test("getFunnelAnalysis returns funnel data", () => {
    analyticsEngine.track("user_registered", "funnel_user");
    analyticsEngine.track("email_verified", "funnel_user");

    const funnel = analyticsEngine.getFunnelAnalysis("user_activation");
    expect(funnel).toBeDefined();
    expect(funnel.name).toBe("user_activation");
    expect(Array.isArray(funnel.steps)).toBe(true);
    expect(funnel.totalUsers).toBeGreaterThan(0);
  });

  test("getFunnelAnalysis returns null for unknown funnel", () => {
    const funnel = analyticsEngine.getFunnelAnalysis("nonexistent");
    expect(funnel).toBeNull();
  });

  test("getDashboardSummary returns complete data", () => {
    const summary = analyticsEngine.getDashboardSummary();
    expect(summary).toBeDefined();
    expect(typeof summary.todayMessages).toBe("number");
    expect(summary.topEvents).toBeDefined();
    expect(summary.funnels).toBeDefined();
  });

  test("getRetentionData returns cohort data", () => {
    analyticsEngine.track("visit", "retention_user_1");
    analyticsEngine.track("visit", "retention_user_2");

    const retention = analyticsEngine.getRetentionData(4);
    expect(Array.isArray(retention)).toBe(true);
  });

  test("defineFunnel creates a custom funnel", () => {
    analyticsEngine.defineFunnel("custom_funnel", [
      "step_a",
      "step_b",
      "step_c",
    ]);

    analyticsEngine.track("step_a", "custom_user");
    analyticsEngine.track("step_b", "custom_user");

    const funnel = analyticsEngine.getFunnelAnalysis("custom_funnel");
    expect(funnel).toBeDefined();
    expect(funnel.name).toBe("custom_funnel");
    expect(funnel.totalUsers).toBe(1);
  });
});
