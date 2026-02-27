const { getConfig, getTierConfig, getRateLimitConfig } = require("../config");

describe("Config Module", () => {
  test("getConfig returns frozen config object", () => {
    const config = getConfig();
    expect(config).toBeDefined();
    expect(config.port).toBe(5000);
    expect(config.env).toBeDefined();
    expect(Object.isFrozen(config)).toBe(true);
  });

  test("getConfig has all required sections", () => {
    const config = getConfig();
    expect(config.jwt).toBeDefined();
    expect(config.cors).toBeDefined();
    expect(config.rateLimits).toBeDefined();
    expect(config.subscriptionTiers).toBeDefined();
    expect(config.cache).toBeDefined();
    expect(config.queue).toBeDefined();
    expect(config.logging).toBeDefined();
  });

  test("getTierConfig returns correct tier", () => {
    const freeTier = getTierConfig("free");
    expect(freeTier.name).toBe("Free");
    expect(freeTier.price).toBe(0);
    expect(freeTier.messagesPerDay).toBe(25);
    expect(freeTier.apiAccess).toBe(false);

    const proTier = getTierConfig("pro");
    expect(proTier.name).toBe("Pro");
    expect(proTier.price).toBe(19.99);
    expect(proTier.apiAccess).toBe(true);

    const enterpriseTier = getTierConfig("enterprise");
    expect(enterpriseTier.name).toBe("Enterprise");
    expect(enterpriseTier.messagesPerDay).toBe(-1);
  });

  test("getTierConfig returns free tier for unknown tier", () => {
    const tier = getTierConfig("unknown");
    expect(tier.name).toBe("Free");
  });

  test("getRateLimitConfig returns correct limits", () => {
    const freeLimit = getRateLimitConfig("free");
    expect(freeLimit.max).toBe(50);

    const proLimit = getRateLimitConfig("pro");
    expect(proLimit.max).toBe(500);

    const enterpriseLimit = getRateLimitConfig("enterprise");
    expect(enterpriseLimit.max).toBe(5000);
  });

  test("subscription tiers have required fields", () => {
    const config = getConfig();
    Object.values(config.subscriptionTiers).forEach((tier) => {
      expect(tier.name).toBeDefined();
      expect(typeof tier.price).toBe("number");
      expect(typeof tier.messagesPerDay).toBe("number");
      expect(Array.isArray(tier.features)).toBe(true);
      expect(tier.aiModel).toBeDefined();
      expect(typeof tier.maxTokensPerRequest).toBe("number");
    });
  });
});
