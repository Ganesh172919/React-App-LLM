/**
 * ============================================================================
 * MEDASSIST AI - ANALYTICS CONTROLLER (analyticsController.js)
 * ============================================================================
 * Role:
 *   Aggregates operational metrics, user conversation patterns, verification
 *   audit statistics, and dataset quality profiling for the analytics dashboard.
 *
 * Key Capabilities:
 *   - Flexible Time Ranges: Supports 7, 30, or 90-day time-series windowing.
 *   - User-Scoped Conversation Metrics: Aggregates total sessions, exchanges,
 *     medical vs. general breakdown, citation counts, and grounding coverage rates.
 *   - Verification Audit Breakdown: Tabulates verification outcomes (citation_checked,
 *     invalid_citations, sources_supplied, references_only, safety_redirect, generated).
 *   - Static Dataset Profiling Integration: Reads `dataset_analysis.json` and
 *     `dataset_audit.json` to present live dataset health metrics without running training.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: ANALYTICS AGGREGATION PIPELINE
 * ----------------------------------------------------------------------------
 * [analyticsController.js (getOverview)]
 *   │
 *   ├── 1. Request Query Validation
 *   │     ├── Parses req.query.days (default 7; whitelist: 7, 30, 90)
 *   │     └── Builds daily bucket array for the chosen range in UTC
 *   │
 *   ├── 2. User Conversation Aggregation
 *   │     ├── Queries Chat.find({ userId: req.user.id })
 *   │     ├── Computes total sessions and total message exchanges
 *   │     ├── Increments daily trend buckets by message timestamps
 *   │     ├── Tracks medical response counts vs. general responses
 *   │     ├── Sums total PubMed citations attached across conversations
 *   │     └── Compiles verification status dictionary and AI provider usage
 *   │
 *   ├── 3. Dataset Summary Ingestion (readDatasetSummary)
 *   │     ├── Reads Model and Dataset/reports/dataset_analysis.json
 *   │     ├── Reads Model and Dataset/reports/dataset_audit.json
 *   │     └── Returns row counts, quality flags, length distribution, question types
 *   │
 *   └── 4. Response Dispatch
 *         └── Returns 200 OK with:
 *               { generatedAt, rangeDays, summary, breakdown, trend, verification, dataset }
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: METRICS ACCUMULATION & REPORT GENERATION
 * ----------------------------------------------------------------------------
 *  Client Dashboard             analyticsController                 MongoDB / Filesystem
 *         │                               │                                  │
 *         │── GET /api/analytics/overview │                                  │
 *         │   ?days=30                    ├─ Validate days (7/30/90)         │
 *         │                               ├─ Chat.find({ userId }) ─────────>│
 *         │                               │<─ [{ messages, isMedical... }] ──┤
 *         │                               │                                  │
 *         │                               ├─ Process daily buckets           │
 *         │                               ├─ Compute grounding percentage    │
 *         │                               ├─ Aggregate verification statuses │
 *         │                               │                                  │
 *         │                               ├─ Read dataset_analysis.json ────>│
 *         │                               ├─ Read dataset_audit.json ───────>│
 *         │                               │<─ JSON profile data ─────────────┤
 *         │                               │                                  │
 *         │<── 200 OK Comprehensive JSON ─┤                                  │
 *         │    Metrics & Trend Data       │                                  │
 * ============================================================================
 */
const fs = require("fs/promises");
const path = require("path");
const Chat = require("../models/chatModel");

const DATASET_REPORT = path.resolve(
  __dirname,
  "../../Model and Dataset/reports/dataset_analysis.json"
);
const DATASET_AUDIT = path.resolve(
  __dirname,
  "../../Model and Dataset/reports/dataset_audit.json"
);
const ALLOWED_RANGES = new Set([7, 30, 90]);

const toDateKey = (value) => new Date(value).toISOString().slice(0, 10);

const readJson = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Unable to read ${path.basename(filePath)}:`, error.message);
    }
    return null;
  }
};

/**
 * Safely parse and consolidate offline dataset analysis and audit reports.
 *
 * Mindmap Flow:
 * ```
 * [readDatasetSummary]
 *        │
 *        ├── 1. Concurrent I/O (Promise.all([readJson(DATASET_REPORT), readJson(DATASET_AUDIT)]))
 *        ├── 2. Structural Parsing (rows, quality flags, quality rates, distribution)
 *        ├── 3. Audit Merge (multipleAnswerQuestions, contentFlags)
 *        └── 4. Graceful Fallback (returns null on ENOENT or parse error without crashing)
 * ```
 *
 * Sequence Flow:
 * ```
 * Caller (getOverview)          readDatasetSummary()           Filesystem (JSON Reports)
 *       │                                │                                │
 *       │── readDatasetSummary() ───────>│                                │
 *       │                                ├─ readJson(dataset_analysis) ──>│
 *       │                                ├─ readJson(dataset_audit) ─────>│
 *       │                                │<─ parsed report objects ───────┤
 *       │                                ├─ extract summary schema        │
 *       │<── { rows, rates, audit } ─────┤                                │
 * ```
 *
 * @returns {Promise<object|null>} Consolidated dataset metadata or null if unavailable.
 */
const readDatasetSummary = async () => {
  const [report, audit] = await Promise.all([
    readJson(DATASET_REPORT),
    readJson(DATASET_AUDIT),
  ]);
  if (!report) return null;
  try {
    return {
      rows: report.rows,
      qualityFlags: report.quality_flags,
      qualityRates: report.quality_rates_percent,
      answerLengthDistribution: report.answer_length_distribution,
      questionTypes: report.question_types,
      generatedAt: report.generated_at_utc,
      audit: audit
        ? {
            multipleAnswerQuestions: audit.multiple_answer_questions,
            contentFlags: audit.content_flags,
          }
        : null,
    };
  } catch (error) {
    console.warn("Unable to parse dataset analytics:", error.message);
    return null;
  }
};

/**
 * Generate comprehensive operational analytics for authenticated user.
 *
 * Mindmap Flow:
 * ```
 * [getOverview Controller]
 *        │
 *        ├── 1. Parameter Normalization (days = 7 / 30 / 90)
 *        ├── 2. Historical Query (Chat.find({ userId }).select(...).lean())
 *        ├── 3. Time-Series Windowing (UTC daily buckets for sessions & exchanges)
 *        ├── 4. Grounding Metrics Calculation (citations, citedResponses, groundingRate %)
 *        ├── 5. Verification Status Aggregation (statuses tally & provider distribution)
 *        ├── 6. Offline Dataset Metrics Integration (readDatasetSummary())
 *        └── 7. Response Dispatch (200 OK with summary, breakdown, trend, dataset)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client Browser            analyticsController (getOverview)      MongoDB         Filesystem
 *       │                                │                           │                 │
 *       │── GET /api/analytics/overview ─>│                           │                 │
 *       │   ?days=30                     ├─ validate query params    │                 │
 *       │                                ├─ Chat.find({ userId }) ──>│                 │
 *       │                                │<─ lean chat array ────────┤                 │
 *       │                                ├─ populate trend buckets   │                 │
 *       │                                ├─ tally citations/statuses │                 │
 *       │                                ├─ readDatasetSummary() ─────────────────────>│
 *       │                                │<─ dataset metadata ─────────────────────────┤
 *       │<── 200 OK { summary, trend } ──┤                                             │
 * ```
 *
 * @param {import("express").Request} req Express authenticated request.
 * @param {import("express").Response} res Express JSON response.
 * @returns {Promise<void>}
 */
exports.getOverview = async (req, res) => {
  try {
    const requestedDays = Number.parseInt(req.query.days, 10);
    const days = ALLOWED_RANGES.has(requestedDays) ? requestedDays : 7;
    const chats = await Chat.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .select("messages isMedical createdAt updatedAt")
      .lean();

    const now = new Date();
    const trend = Array.from({ length: days }, (_, index) => {
      const date = new Date(now);
      date.setUTCDate(now.getUTCDate() - (days - 1 - index));
      return { date: toDateKey(date), sessions: 0, exchanges: 0 };
    });
    const trendByDate = new Map(trend.map((item) => [item.date, item]));

    let totalMessages = 0;
    let medicalResponses = 0;
    let citedResponses = 0;
    let citations = 0;
    const verificationStatuses = {};
    const providers = {};

    chats.forEach((chat) => {
      const messages = chat.messages || [];
      totalMessages += messages.length;
      messages.forEach((message) => {
        if (message.isMedical) medicalResponses += 1;
        if (message.references?.length) citedResponses += 1;
        citations += message.references?.length || 0;
        const messagePoint = trendByDate.get(toDateKey(message.timestamp));
        if (messagePoint) messagePoint.exchanges += 1;
        const status = message.verification?.status || "not_recorded";
        verificationStatuses[status] = (verificationStatuses[status] || 0) + 1;
        const provider = message.verification?.provider;
        if (provider) providers[provider] = (providers[provider] || 0) + 1;
      });

      const point = trendByDate.get(toDateKey(chat.createdAt));
      if (point) {
        point.sessions += 1;
      }
    });

    const medicalSessions = chats.filter((chat) => chat.isMedical).length;
    const dataset = await readDatasetSummary();

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      rangeDays: days,
      summary: {
        totalSessions: chats.length,
        totalMessages,
        medicalSessions,
        medicalResponses,
        citedResponses,
        citations,
        averageMessagesPerSession: chats.length
          ? Number((totalMessages / chats.length).toFixed(1))
          : 0,
        groundingRate: medicalResponses
          ? Number(((citedResponses / medicalResponses) * 100).toFixed(1))
          : 0,
      },
      breakdown: [
        { label: "Medical", value: medicalSessions },
        { label: "General", value: chats.length - medicalSessions },
      ],
      trend,
      verification: {
        statuses: verificationStatuses,
        providers,
      },
      dataset,
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    return res.status(500).json({ message: "Unable to load analytics" });
  }
};
