const featureFlagService = require("../services/featureFlags");

describe("Feature Flag Service", () => {
  test("has default flags initialized", () => {
    const flags = featureFlagService.getAllFlags();
    expect(Object.keys(flags).length).toBeGreaterThan(0);
    expect(flags.medical_query).toBeDefined();
    expect(flags.advanced_ai).toBeDefined();
    expect(flags.api_access).toBeDefined();
  });

  test("isEnabled returns true for free tier features", () => {
    expect(featureFlagService.isEnabled("medical_query", "free")).toBe(true);
    expect(featureFlagService.isEnabled("websocket_sync", "free")).toBe(true);
  });

  test("isEnabled returns false for pro-only features on free tier", () => {
    expect(featureFlagService.isEnabled("advanced_ai", "free")).toBe(false);
    expect(featureFlagService.isEnabled("api_access", "free")).toBe(false);
  });

  test("isEnabled returns true for pro features on pro tier", () => {
    expect(featureFlagService.isEnabled("advanced_ai", "pro")).toBe(true);
    expect(featureFlagService.isEnabled("api_access", "pro")).toBe(true);
    expect(featureFlagService.isEnabled("analytics_dashboard", "pro")).toBe(true);
  });

  test("isEnabled returns true for enterprise features on enterprise tier", () => {
    expect(featureFlagService.isEnabled("plugin_system", "enterprise")).toBe(true);
    expect(featureFlagService.isEnabled("agent_system", "enterprise")).toBe(true);
    expect(featureFlagService.isEnabled("admin_panel", "enterprise")).toBe(true);
  });

  test("isEnabled returns false for disabled flags", () => {
    expect(featureFlagService.isEnabled("real_time_collab", "enterprise")).toBe(false);
  });

  test("isEnabled returns false for unknown flags", () => {
    expect(featureFlagService.isEnabled("nonexistent", "enterprise")).toBe(false);
  });

  test("setFlag updates flag configuration", () => {
    featureFlagService.setFlag("medical_query", { rolloutPercentage: 50 });
    const flags = featureFlagService.getAllFlags();
    expect(flags.medical_query.rolloutPercentage).toBe(50);

    featureFlagService.setFlag("medical_query", { rolloutPercentage: 100 });
  });

  test("user overrides work correctly", () => {
    featureFlagService.setUserOverride("advanced_ai", "user123", true);
    expect(featureFlagService.isEnabled("advanced_ai", "free", "user123")).toBe(true);

    featureFlagService.removeUserOverride("advanced_ai", "user123");
    expect(featureFlagService.isEnabled("advanced_ai", "free", "user123")).toBe(false);
  });

  test("getUserFlags returns flags with enabledForUser field", () => {
    const flags = featureFlagService.getUserFlags("pro", "testUser");
    expect(flags.medical_query.enabledForUser).toBe(true);
    expect(flags.advanced_ai.enabledForUser).toBe(true);
    expect(flags.plugin_system.enabledForUser).toBe(false);
  });
});
