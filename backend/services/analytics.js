const { logger } = require("./logger");
const jobQueue = require("./jobQueue");

class AnalyticsEngine {
  constructor() {
    this.events = [];
    this.aggregations = new Map();
    this.funnels = new Map();
    this.cohorts = new Map();
    this.maxEvents = 50000;

    this._initFunnels();
  }

  _initFunnels() {
    this.defineFunnel("user_activation", [
      "user_registered",
      "email_verified",
      "first_message",
      "second_session",
      "subscription_upgraded",
    ]);

    this.defineFunnel("api_adoption", [
      "subscription_upgraded",
      "api_key_created",
      "first_api_call",
      "regular_api_usage",
    ]);

    this.defineFunnel("feature_discovery", [
      "first_message",
      "medical_query_used",
      "chat_exported",
      "plugin_installed",
      "agent_used",
    ]);
  }

  track(eventName, userId, properties = {}) {
    const event = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      event: eventName,
      userId,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: properties.sessionId || null,
    };

    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-Math.floor(this.maxEvents / 2));
    }

    this._updateAggregation(eventName, userId);
    this._updateFunnels(eventName, userId);
    this._updateCohort(userId);

    jobQueue
      .enqueue("analytics_event", event, { priority: -1 })
      .catch(() => {});

    return event.id;
  }

  _updateAggregation(eventName, userId) {
    const dateKey = new Date().toISOString().split("T")[0];
    const hourKey = `${dateKey}:${new Date().getHours()}`;

    const dailyKey = `daily:${eventName}:${dateKey}`;
    const hourlyKey = `hourly:${eventName}:${hourKey}`;
    const userDailyKey = `user:${userId}:${eventName}:${dateKey}`;

    this._incrementAggregation(dailyKey);
    this._incrementAggregation(hourlyKey);
    this._incrementAggregation(userDailyKey);
  }

  _incrementAggregation(key) {
    const current = this.aggregations.get(key) || 0;
    this.aggregations.set(key, current + 1);
  }

  defineFunnel(name, steps) {
    this.funnels.set(name, {
      steps,
      userProgress: new Map(),
    });
  }

  _updateFunnels(eventName, userId) {
    for (const [, funnel] of this.funnels) {
      const stepIndex = funnel.steps.indexOf(eventName);
      if (stepIndex === -1) continue;

      const currentStep = funnel.userProgress.get(userId) || -1;
      if (stepIndex === currentStep + 1) {
        funnel.userProgress.set(userId, stepIndex);
      }
    }
  }

  _updateCohort(userId) {
    const weekKey = this._getWeekKey(new Date());
    if (!this.cohorts.has(userId)) {
      this.cohorts.set(userId, {
        joinWeek: weekKey,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        totalEvents: 0,
      });
    }

    const cohort = this.cohorts.get(userId);
    cohort.lastSeen = new Date().toISOString();
    cohort.totalEvents++;
  }

  _getWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  }

  getFunnelAnalysis(funnelName) {
    const funnel = this.funnels.get(funnelName);
    if (!funnel) return null;

    const stepCounts = new Array(funnel.steps.length).fill(0);
    for (const [, step] of funnel.userProgress) {
      for (let i = 0; i <= step; i++) {
        stepCounts[i]++;
      }
    }

    const totalUsers = funnel.userProgress.size;
    return {
      name: funnelName,
      steps: funnel.steps.map((step, i) => ({
        step,
        users: stepCounts[i],
        percentage: totalUsers > 0 ? ((stepCounts[i] / totalUsers) * 100).toFixed(1) : "0",
        dropoff:
          i > 0 && stepCounts[i - 1] > 0
            ? (((stepCounts[i - 1] - stepCounts[i]) / stepCounts[i - 1]) * 100).toFixed(1)
            : "0",
      })),
      totalUsers,
      completionRate:
        totalUsers > 0
          ? (
              (stepCounts[stepCounts.length - 1] / totalUsers) *
              100
            ).toFixed(1)
          : "0",
    };
  }

  getEventCount(eventName, days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const counts = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const key = `daily:${eventName}:${dateKey}`;
      counts[dateKey] = this.aggregations.get(key) || 0;
    }

    return counts;
  }

  getTopEvents(limit = 20) {
    const eventCounts = {};
    for (const event of this.events) {
      eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
    }

    return Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([event, count]) => ({ event, count }));
  }

  getUserJourney(userId, limit = 50) {
    return this.events
      .filter((e) => e.userId === userId)
      .slice(-limit)
      .map((e) => ({
        event: e.event,
        timestamp: e.timestamp,
        properties: e.properties,
      }));
  }

  getRetentionData(weeks = 8) {
    const cohortData = {};

    for (const [userId, data] of this.cohorts) {
      const joinWeek = data.joinWeek;
      if (!cohortData[joinWeek]) {
        cohortData[joinWeek] = {
          joinWeek,
          totalUsers: 0,
          weeklyActive: new Array(weeks).fill(0),
        };
      }
      cohortData[joinWeek].totalUsers++;

      const lastSeenWeek = this._getWeekKey(new Date(data.lastSeen));
      const weekDiff = Math.floor(
        (new Date(lastSeenWeek) - new Date(joinWeek)) / (7 * 24 * 60 * 60 * 1000)
      );
      if (weekDiff >= 0 && weekDiff < weeks) {
        cohortData[joinWeek].weeklyActive[weekDiff]++;
      }
    }

    return Object.values(cohortData).map((cohort) => ({
      ...cohort,
      retention: cohort.weeklyActive.map((active) =>
        cohort.totalUsers > 0
          ? ((active / cohort.totalUsers) * 100).toFixed(1)
          : "0"
      ),
    }));
  }

  getDashboardSummary() {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.setDate(now.getDate() - 1))
      .toISOString()
      .split("T")[0];

    const todayMessages = this.aggregations.get(`daily:message_sent:${today}`) || 0;
    const yesterdayMessages =
      this.aggregations.get(`daily:message_sent:${yesterday}`) || 0;

    const activeUsersToday = new Set(
      this.events
        .filter((e) => e.timestamp.startsWith(today))
        .map((e) => e.userId)
    ).size;

    return {
      todayMessages,
      messageGrowth:
        yesterdayMessages > 0
          ? (
              ((todayMessages - yesterdayMessages) / yesterdayMessages) *
              100
            ).toFixed(1)
          : "0",
      activeUsersToday,
      totalEvents: this.events.length,
      topEvents: this.getTopEvents(5),
      funnels: Array.from(this.funnels.keys()).map((name) =>
        this.getFunnelAnalysis(name)
      ),
    };
  }
}

const analyticsEngine = new AnalyticsEngine();
module.exports = analyticsEngine;
