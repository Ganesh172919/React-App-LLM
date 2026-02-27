const { getConfig } = require("../config");
const { logger } = require("./logger");

class CacheService {
  constructor() {
    const config = getConfig();
    this.store = new Map();
    this.ttl = config.cache.ttl * 1000;
    this.maxSize = config.cache.maxSize;
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0 };

    this._cleanupInterval = setInterval(
      () => this._cleanup(),
      config.cache.checkPeriod * 1000
    );
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;
    return entry.value;
  }

  set(key, value, ttlOverride = null) {
    if (this.store.size >= this.maxSize) {
      this._evictLRU();
    }

    const expiresAt = Date.now() + (ttlOverride || this.ttl);
    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
    });
    this.stats.sets++;
  }

  delete(key) {
    const existed = this.store.delete(key);
    if (existed) this.stats.deletes++;
    return existed;
  }

  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  clear() {
    const size = this.store.size;
    this.store.clear();
    logger.info("Cache cleared", { entriesRemoved: size });
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.store.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + "%" : "0%",
    };
  }

  _evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  _cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.debug("Cache cleanup completed", { entriesRemoved: cleaned });
    }
  }

  async getOrSet(key, fetchFn, ttlOverride = null) {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const value = await fetchFn();
    this.set(key, value, ttlOverride);
    return value;
  }

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    let count = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    logger.debug("Cache pattern invalidation", { pattern, entriesRemoved: count });
    return count;
  }

  destroy() {
    clearInterval(this._cleanupInterval);
    this.store.clear();
  }
}

const cacheService = new CacheService();
module.exports = cacheService;
