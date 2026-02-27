const usageTracker = require("../services/usageTracker");

describe("Usage Tracker", () => {
  const testUserId = "test_user_123";

  test("trackMessage increments message count", () => {
    usageTracker.trackMessage(testUserId, 100, false);
    const usage = usageTracker.getDailyUsage(testUserId);
    expect(usage.messageCount).toBeGreaterThanOrEqual(1);
    expect(usage.tokenCount).toBeGreaterThanOrEqual(100);
  });

  test("trackMessage with medical flag increments medical queries", () => {
    const beforeUsage = usageTracker.getDailyUsage(testUserId);
    const beforeMedical = beforeUsage.medicalQueries;

    usageTracker.trackMessage(testUserId, 50, true);
    const usage = usageTracker.getDailyUsage(testUserId);
    expect(usage.medicalQueries).toBe(beforeMedical + 1);
  });

  test("trackApiCall increments API call count", () => {
    const beforeUsage = usageTracker.getDailyUsage(testUserId);
    const before = beforeUsage.apiCalls;

    usageTracker.trackApiCall(testUserId);
    const usage = usageTracker.getDailyUsage(testUserId);
    expect(usage.apiCalls).toBe(before + 1);
  });

  test("trackSessionCreated increments session count", () => {
    const beforeUsage = usageTracker.getDailyUsage(testUserId);
    const before = beforeUsage.sessionsCreated;

    usageTracker.trackSessionCreated(testUserId);
    const usage = usageTracker.getDailyUsage(testUserId);
    expect(usage.sessionsCreated).toBe(before + 1);
  });

  test("trackAgentInvocation increments agent count", () => {
    const beforeUsage = usageTracker.getDailyUsage(testUserId);
    const before = beforeUsage.agentInvocations;

    usageTracker.trackAgentInvocation(testUserId, "code_gen");
    const usage = usageTracker.getDailyUsage(testUserId);
    expect(usage.agentInvocations).toBe(before + 1);
  });

  test("checkDailyLimit works with limits", () => {
    const result = usageTracker.checkDailyLimit(testUserId, 1000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
    expect(result.used).toBeGreaterThan(0);
  });

  test("checkDailyLimit with unlimited returns allowed", () => {
    const result = usageTracker.checkDailyLimit(testUserId, -1);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1);
  });

  test("getTokenUsage returns token data", () => {
    const tokenUsage = usageTracker.getTokenUsage(testUserId);
    expect(tokenUsage.totalTokens).toBeGreaterThan(0);
    expect(tokenUsage.monthlyTokens).toBeGreaterThan(0);
  });

  test("getUserAnalytics returns array of daily data", () => {
    const analytics = usageTracker.getUserAnalytics(testUserId, 7);
    expect(Array.isArray(analytics)).toBe(true);
    expect(analytics.length).toBe(7);
    analytics.forEach((day) => {
      expect(day.date).toBeDefined();
      expect(typeof day.messageCount).toBe("number");
    });
  });

  test("getSystemAnalytics returns aggregate data", () => {
    const systemAnalytics = usageTracker.getSystemAnalytics();
    expect(systemAnalytics.totalMessages).toBeGreaterThan(0);
    expect(systemAnalytics.uniqueUsers).toBeGreaterThan(0);
  });

  test("getRecentEvents returns events array", () => {
    const events = usageTracker.getRecentEvents(10);
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBeDefined();
    expect(events[0].userId).toBeDefined();
  });
});
