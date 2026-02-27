const cacheService = require("../services/cache");

describe("Cache Service", () => {
  beforeEach(() => {
    cacheService.clear();
  });

  test("set and get a value", () => {
    cacheService.set("key1", "value1");
    expect(cacheService.get("key1")).toBe("value1");
  });

  test("returns null for missing key", () => {
    expect(cacheService.get("nonexistent")).toBeNull();
  });

  test("returns null for expired key", () => {
    cacheService.set("expiring", "value", 1);
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(cacheService.get("expiring")).toBeNull();
        resolve();
      }, 10);
    });
  });

  test("has() returns correct result", () => {
    cacheService.set("exists", "yes");
    expect(cacheService.has("exists")).toBe(true);
    expect(cacheService.has("nope")).toBe(false);
  });

  test("delete removes a key", () => {
    cacheService.set("toDelete", "value");
    expect(cacheService.delete("toDelete")).toBe(true);
    expect(cacheService.get("toDelete")).toBeNull();
  });

  test("clear removes all entries", () => {
    cacheService.set("a", 1);
    cacheService.set("b", 2);
    cacheService.clear();
    expect(cacheService.get("a")).toBeNull();
    expect(cacheService.get("b")).toBeNull();
  });

  test("getStats returns hit/miss counts", () => {
    cacheService.set("key", "val");
    cacheService.get("key");
    cacheService.get("miss");
    const stats = cacheService.getStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
  });

  test("getOrSet fetches and caches value", async () => {
    let callCount = 0;
    const fetchFn = async () => {
      callCount++;
      return "fetched_value";
    };

    const val1 = await cacheService.getOrSet("lazy", fetchFn);
    expect(val1).toBe("fetched_value");
    expect(callCount).toBe(1);

    const val2 = await cacheService.getOrSet("lazy", fetchFn);
    expect(val2).toBe("fetched_value");
    expect(callCount).toBe(1);
  });

  test("invalidatePattern removes matching keys", () => {
    cacheService.set("user:1:profile", "p1");
    cacheService.set("user:2:profile", "p2");
    cacheService.set("session:abc", "s1");

    const removed = cacheService.invalidatePattern("^user:");
    expect(removed).toBe(2);
    expect(cacheService.get("session:abc")).toBe("s1");
  });
});
