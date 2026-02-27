const aiAgent = require("../services/aiAgent");

describe("AI Agent", () => {
  test("getCapabilities returns agent capabilities", () => {
    const caps = aiAgent.getCapabilities();
    expect(caps.taskTypes).toBeDefined();
    expect(Array.isArray(caps.taskTypes)).toBe(true);
    expect(caps.supportedLanguages).toBeDefined();
    expect(caps.maxIterations).toBeGreaterThan(0);
    expect(caps.safetyChecks).toBeDefined();
    expect(caps.validationRules).toBeDefined();
  });

  test("runSafetyChecks passes for safe input", async () => {
    const result = await aiAgent.runSafetyChecks({
      requirements: "Create an API endpoint for user management",
    });
    expect(result.safe).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  test("runSafetyChecks fails for dangerous input", async () => {
    const result = await aiAgent.runSafetyChecks({
      requirements: "eval(process.exit())",
    });
    expect(result.safe).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  test("runSafetyChecks fails for oversized input", async () => {
    const largeInput = "a".repeat(150000);
    const result = await aiAgent.runSafetyChecks({
      requirements: largeInput,
    });
    expect(result.safe).toBe(false);
  });

  test("plan decomposes API requirements into steps", async () => {
    const plan = await aiAgent.plan("Create an API endpoint for user search");
    expect(plan.id).toBeDefined();
    expect(plan.requirements).toBe("Create an API endpoint for user search");
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.estimatedComplexity).toBeDefined();

    plan.steps.forEach((step) => {
      expect(step.id).toBeDefined();
      expect(step.description).toBeDefined();
      expect(step.type).toBeDefined();
      expect(step.status).toBe("pending");
    });
  });

  test("plan decomposes model requirements", async () => {
    const plan = await aiAgent.plan("Create a database model for products");
    expect(plan.steps.some((s) => s.description.includes("model"))).toBe(true);
  });

  test("plan decomposes UI requirements", async () => {
    const plan = await aiAgent.plan("Create a React component for dashboard");
    expect(plan.steps.some((s) => s.description.includes("component"))).toBe(
      true
    );
  });

  test("plan handles generic requirements", async () => {
    const plan = await aiAgent.plan("Improve the system performance");
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  test("execute runs a plan through to completion", async () => {
    const plan = await aiAgent.plan("Create a simple utility function");
    const execution = await aiAgent.execute(plan, "test_user");

    expect(execution.planId).toBe(plan.id);
    expect(execution.status).toBeDefined();
    expect(execution.results.length).toBeGreaterThan(0);
    expect(execution.iterations).toBeGreaterThan(0);
    expect(execution.validation).toBeDefined();
  });

  test("plan uses cache for repeated requirements", async () => {
    const uniqueReq = `Build module ${Date.now()}`;
    const plan1 = await aiAgent.plan(uniqueReq);
    const plan2 = await aiAgent.plan(uniqueReq);
    expect(plan1.id).toBe(plan2.id);
  });
});
