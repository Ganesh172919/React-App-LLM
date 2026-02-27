const { logger } = require("./logger");

class UsageTracker {
  constructor() {
    this.usageStore = new Map();
    this.dailyStore = new Map();
    this.tokenStore = new Map();
    this.eventLog = [];
    this.maxEventLogSize = 10000;

    this._resetInterval = setInterval(
      () => this._resetDailyCounters(),
      60 * 60 * 1000
    );
  }

  _getUserKey(userId) {
    const date = new Date().toISOString().split("T")[0];
    return `${userId}:${date}`;
  }

  _getOrCreateUsage(userId) {
    const key = this._getUserKey(userId);
    if (!this.dailyStore.has(key)) {
      this.dailyStore.set(key, {
        userId,
        date: new Date().toISOString().split("T")[0],
        messageCount: 0,
        tokenCount: 0,
        medicalQueries: 0,
        apiCalls: 0,
        sessionsCreated: 0,
        agentInvocations: 0,
        pluginCalls: 0,
        errors: 0,
        totalResponseTime: 0,
        requestCount: 0,
      });
    }
    return this.dailyStore.get(key);
  }

  trackMessage(userId, tokenCount = 0, isMedical = false) {
    const usage = this._getOrCreateUsage(userId);
    usage.messageCount++;
    usage.tokenCount += tokenCount;
    if (isMedical) usage.medicalQueries++;

    this._logEvent("message", userId, { tokenCount, isMedical });
    this._updateTotalTokens(userId, tokenCount);
  }

  trackApiCall(userId) {
    const usage = this._getOrCreateUsage(userId);
    usage.apiCalls++;
    this._logEvent("api_call", userId);
  }

  trackSessionCreated(userId) {
    const usage = this._getOrCreateUsage(userId);
    usage.sessionsCreated++;
    this._logEvent("session_created", userId);
  }

  trackAgentInvocation(userId, taskType) {
    const usage = this._getOrCreateUsage(userId);
    usage.agentInvocations++;
    this._logEvent("agent_invocation", userId, { taskType });
  }

  trackPluginCall(userId, pluginId) {
    const usage = this._getOrCreateUsage(userId);
    usage.pluginCalls++;
    this._logEvent("plugin_call", userId, { pluginId });
  }

  trackError(userId, errorType) {
    const usage = this._getOrCreateUsage(userId);
    usage.errors++;
    this._logEvent("error", userId, { errorType });
  }

  trackResponseTime(userId, responseTimeMs) {
    const usage = this._getOrCreateUsage(userId);
    usage.totalResponseTime += responseTimeMs;
    usage.requestCount++;
  }

  _updateTotalTokens(userId, tokenCount) {
    const current = this.tokenStore.get(userId) || {
      totalTokens: 0,
      monthlyTokens: 0,
      lastReset: new Date().toISOString().slice(0, 7),
    };

    const currentMonth = new Date().toISOString().slice(0, 7);
    if (current.lastReset !== currentMonth) {
      current.monthlyTokens = 0;
      current.lastReset = currentMonth;
    }

    current.totalTokens += tokenCount;
    current.monthlyTokens += tokenCount;
    this.tokenStore.set(userId, current);
  }

  _logEvent(type, userId, meta = {}) {
    if (this.eventLog.length >= this.maxEventLogSize) {
      this.eventLog = this.eventLog.slice(-Math.floor(this.maxEventLogSize / 2));
    }

    this.eventLog.push({
      type,
      userId,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }

  getDailyUsage(userId) {
    return this._getOrCreateUsage(userId);
  }

  getTokenUsage(userId) {
    return (
      this.tokenStore.get(userId) || {
        totalTokens: 0,
        monthlyTokens: 0,
        lastReset: new Date().toISOString().slice(0, 7),
      }
    );
  }

  checkDailyLimit(userId, limit) {
    if (limit === -1) return { allowed: true, remaining: -1, used: 0 };
    const usage = this._getOrCreateUsage(userId);
    const remaining = Math.max(0, limit - usage.messageCount);
    return {
      allowed: usage.messageCount < limit,
      remaining,
      used: usage.messageCount,
      limit,
    };
  }

  getUserAnalytics(userId, days = 7) {
    const analytics = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const key = `${userId}:${dateStr}`;
      const usage = this.dailyStore.get(key);

      analytics.push({
        date: dateStr,
        messageCount: usage?.messageCount || 0,
        tokenCount: usage?.tokenCount || 0,
        medicalQueries: usage?.medicalQueries || 0,
        apiCalls: usage?.apiCalls || 0,
        agentInvocations: usage?.agentInvocations || 0,
        avgResponseTime:
          usage && usage.requestCount > 0
            ? Math.round(usage.totalResponseTime / usage.requestCount)
            : 0,
      });
    }

    return analytics.reverse();
  }

  getSystemAnalytics() {
    let totalMessages = 0;
    let totalTokens = 0;
    let totalUsers = new Set();
    let totalApiCalls = 0;

    for (const [key, usage] of this.dailyStore) {
      totalMessages += usage.messageCount;
      totalTokens += usage.tokenCount;
      totalUsers.add(usage.userId);
      totalApiCalls += usage.apiCalls;
    }

    return {
      totalMessages,
      totalTokens,
      uniqueUsers: totalUsers.size,
      totalApiCalls,
      eventLogSize: this.eventLog.length,
      storeSize: this.dailyStore.size,
    };
  }

  getRecentEvents(limit = 50) {
    return this.eventLog.slice(-limit);
  }

  _resetDailyCounters() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 30);
    const cutoff = yesterday.toISOString().split("T")[0];

    let cleaned = 0;
    for (const [key] of this.dailyStore) {
      const [, date] = key.split(":");
      if (date < cutoff) {
        this.dailyStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info("Usage data cleanup completed", { entriesRemoved: cleaned });
    }
  }

  destroy() {
    clearInterval(this._resetInterval);
  }
}

const usageTracker = new UsageTracker();
module.exports = usageTracker;
