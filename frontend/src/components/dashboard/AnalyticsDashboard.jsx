/**
 * ============================================================================
 * MEDASSIST AI - OPERATIONAL ANALYTICS DASHBOARD (AnalyticsDashboard.jsx)
 * ============================================================================
 * Role:
 *   Interactive analytics visualization dashboard reporting user conversation
 *   activity, medical source grounding coverage, verification audit categories,
 *   and current static dataset quality findings.
 *
 * Visual Components:
 *   - Metric Cards: Total Sessions, Q&A Exchanges, Medical Sessions, Citations,
 *     and Grounding Coverage percentage.
 *   - SVG Activity Chart: Dual-curve SVG visualization displaying daily exchanges
 *     (cyan line with gradient fill) and sessions (blue dashed line) across selectable
 *     7, 30, or 90-day sliding windows.
 *   - Verification Outcomes Breakdown: Proportional progress bars for audit categories.
 *   - Dataset Quality & Audit Signals: Summarizes raw CSV profiling rows, duplicates,
 *     missing answers, multi-answer questions, question types, and answer length bands.
 *   - JSON Exporter: Downloads full telemetry snapshot to local client file.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: DASHBOARD DATA & COMPONENT ARCHITECTURE
 * ----------------------------------------------------------------------------
 * [AnalyticsDashboard Component]
 *   │
 *   ├── 1. State Management
 *   │     ├── rangeDays (7 | 30 | 90)
 *   │     ├── status ("loading" | "ready" | "error")
 *   │     └── analytics (summary, breakdown, trend, verification, dataset)
 *   │
 *   ├── 2. Data Fetching (loadAnalytics)
 *   │     └── Calls GET /api/analytics/overview?days=${rangeDays}
 *   │
 *   ├── 3. Reactive Calculations (useMemo)
 *   │     ├── buildChart(): Maps daily trend points to SVG coordinate space
 *   │     └── pathFromPoints(): Generates SVG bezier/polyline path string
 *   │
 *   ├── 4. Visual Sections
 *   │     ├── Header: Period toggles (7/30/90 days), Export JSON, Refresh
 *   │     ├── Key Metrics Grid: 5 responsive <MetricCard /> components
 *   │     ├── Activity & Verification Grid:
 *   │     │     ├── SVG Line/Area Chart (Exchanges vs Sessions)
 *   │     │     └── Verification Outcomes (Horizontal Progress Bars)
 *   │     └── Dataset Quality & Distributions:
 *   │           ├── Dataset summary grid & multi-answer audit alert
 *   │           ├── Question mix classification distribution
 *   │           └── Answer length word-count distribution
 *   │
 *   └── 5. Export Utility (exportAnalytics)
 *         └── Serializes analytics payload into medassist-analytics-N-days.json
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: DASHBOARD DATA ACQUISITION & RENDERING
 * ----------------------------------------------------------------------------
 *  User Selects 30 Days ──► setRangeDays(30)
 *                                  │
 *                                  ▼
 *                  GET /api/analytics/overview?days=30
 *                                  │
 *                                  ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ Response Payload Processing:                           │
 *  │ 1. Compute Max Values for Chart & Bar Scaling          │
 *  │ 2. Generate SVG Paths for Activity Curve               │
 *  │ 3. Populate MetricCards, Tables, and Quality Signals   │
 *  └────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 *  [Render Responsive 7/30/90 Day Analytics Dashboard View]
 * ============================================================================
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";

const EMPTY_ANALYTICS = {
  generatedAt: null,
  rangeDays: 7,
  summary: {
    totalSessions: 0,
    totalMessages: 0,
    medicalSessions: 0,
    medicalResponses: 0,
    citedResponses: 0,
    citations: 0,
    averageMessagesPerSession: 0,
    groundingRate: 0,
  },
  breakdown: [],
  trend: [],
  verification: { statuses: {}, providers: {} },
  dataset: null,
};

const number = (value) => new Intl.NumberFormat("en-IN").format(value || 0);
const readableLabel = (value) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());

/**
 * Map time-series trend points to normalized SVG coordinates (x: 18-282, y: 26-112).
 * @param {Array<object>} trend Array of daily trend buckets.
 * @param {string} field Trend field name to map ('sessions' or 'exchanges').
 * @param {number} maxValue Normalizing denominator.
 * @returns {Array<object>} Mapped coordinate points.
 */
function buildChart(trend, field, maxValue) {
  return trend.map((point, index) => ({
    ...point,
    x: trend.length > 1 ? 18 + (index * 264) / (trend.length - 1) : 150,
    y: 112 - ((point[field] || 0) / maxValue) * 86,
  }));
}

/**
 * Convert coordinate points into an SVG path definition string (`M x0,y0 L x1,y1...`).
 * @param {Array<{x: number, y: number}>} points
 * @returns {string}
 */
function pathFromPoints(points) {
  return points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
}

/**
 * Reusable summary metric KPI card.
 */
function MetricCard({ label, value, note, accent = "text-white" }) {
  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </article>
  );
}

function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [status, setStatus] = useState("loading");
  const [rangeDays, setRangeDays] = useState(7);

  const loadAnalytics = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await apiRequest(`/analytics/overview?days=${rangeDays}`);
      setAnalytics(data);
      setStatus("ready");
    } catch (error) {
      console.error("Analytics request failed:", error);
      setStatus("error");
    }
  }, [rangeDays]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const chart = useMemo(() => {
    const maxValue = Math.max(
      ...analytics.trend.flatMap((point) => [point.exchanges || 0, point.sessions || 0]),
      1
    );
    const exchanges = buildChart(analytics.trend, "exchanges", maxValue);
    const sessions = buildChart(analytics.trend, "sessions", maxValue);
    return {
      exchanges,
      sessions,
      exchangePath: pathFromPoints(exchanges),
      sessionPath: pathFromPoints(sessions),
    };
  }, [analytics.trend]);

  /**
   * Serialize active analytics state into a formatted JSON download.
   */
  const exportAnalytics = () => {
    const blob = new Blob([JSON.stringify(analytics, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medassist-analytics-${rangeDays}-days.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const datasetRows = analytics.dataset?.rows;
  const qualityFlags = analytics.dataset?.qualityFlags;
  const audit = analytics.dataset?.audit?.multipleAnswerQuestions;
  const typeEntries = Object.entries(analytics.dataset?.questionTypes || {});
  const maxType = Math.max(...typeEntries.map(([, value]) => value), 1);
  const lengthEntries = Object.entries(analytics.dataset?.answerLengthDistribution || {});
  const maxLengthBand = Math.max(...lengthEntries.map(([, value]) => value), 1);
  const verificationEntries = Object.entries(analytics.verification?.statuses || {}).sort(
    (left, right) => right[1] - left[1]
  );
  const maxVerification = Math.max(...verificationEntries.map(([, value]) => value), 1);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-400">Student project analytics</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Analytics dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Conversation activity, citation checks, and current medical Q&amp;A dataset quality.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1" aria-label="Analytics period">
              {[7, 30, 90].map((days) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => setRangeDays(days)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    rangeDays === days ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  aria-pressed={rangeDays === days}
                >
                  {days} days
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={exportAnalytics}
              disabled={status !== "ready"}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium hover:border-blue-500 disabled:opacity-50"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={status === "loading"}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium hover:border-blue-500 disabled:opacity-50"
            >
              {status === "loading" ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {status === "error" && (
          <div className="mb-6 rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-200" role="alert">
            Analytics could not be loaded. Confirm the API and MongoDB are running, then retry.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Key metrics">
          <MetricCard label="Chat sessions" value={number(analytics.summary.totalSessions)} note="Saved conversations" />
          <MetricCard label="Q&A exchanges" value={number(analytics.summary.totalMessages)} note="Persistent history" />
          <MetricCard label="Medical sessions" value={number(analytics.summary.medicalSessions)} note="PubMed-routed chats" />
          <MetricCard label="Citations shown" value={number(analytics.summary.citations)} note="Visible source links" />
          <MetricCard label="Grounding coverage" value={`${analytics.summary.groundingRate || 0}%`} note="Medical responses with sources" accent="text-cyan-300" />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
          <article className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Conversation activity</h2>
                <p className="text-xs text-slate-500">New sessions and saved Q&amp;A exchanges in UTC</p>
              </div>
              <div className="flex gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-cyan-300" /> Exchanges</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue-500" /> Sessions</span>
              </div>
            </div>
            <svg className="mt-6 h-64 w-full" viewBox="0 0 300 145" role="img" aria-label={`Conversation activity during the last ${rangeDays} days`}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[26, 55, 84, 112].map((y) => (
                <line key={y} x1="18" x2="282" y1={y} y2={y} stroke="#334155" strokeWidth="0.6" />
              ))}
              {chart.exchangePath && <path d={`${chart.exchangePath} L282,120 L18,120 Z`} fill="url(#activityFill)" />}
              {chart.exchangePath && <path d={chart.exchangePath} fill="none" stroke="#67e8f9" strokeWidth="2.4" strokeLinecap="round" />}
              {chart.sessionPath && <path d={chart.sessionPath} fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round" />}
              {chart.exchanges.map((point, index) => {
                const showLabel = rangeDays <= 7 || index % Math.ceil(rangeDays / 7) === 0 || index === chart.exchanges.length - 1;
                return (
                  <g key={point.date}>
                    <circle cx={point.x} cy={point.y} r="2.5" fill="#0f172a" stroke="#67e8f9" strokeWidth="1.7">
                      <title>{`${point.date}: ${point.exchanges} exchanges, ${point.sessions} sessions`}</title>
                    </circle>
                    {showLabel && (
                      <text x={point.x} y="138" textAnchor="middle" fill="#94a3b8" fontSize="6.5">
                        {new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <table className="sr-only">
              <caption>Conversation activity data</caption>
              <thead><tr><th>Date</th><th>Sessions</th><th>Exchanges</th></tr></thead>
              <tbody>{analytics.trend.map((point) => <tr key={point.date}><td>{point.date}</td><td>{point.sessions}</td><td>{point.exchanges}</td></tr>)}</tbody>
            </table>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-semibold">Verification outcomes</h2>
            <p className="mt-1 text-xs text-slate-500">Saved response metadata</p>
            <div className="mt-6 space-y-4">
              {verificationEntries.length ? verificationEntries.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs">
                    <span className="text-slate-300">{readableLabel(label)}</span>
                    <span className="text-slate-500">{number(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.max((value / maxVerification) * 100, 3)}%` }} />
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">Verification metadata appears after responses are saved.</p>}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <article className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Dataset quality</h2>
                <p className="mt-1 text-xs text-slate-500">Descriptive CSV profile</p>
              </div>
              <span className="rounded-lg bg-emerald-400/10 px-3 py-1 text-[11px] text-emerald-300">No training</span>
            </div>
            {datasetRows ? (
              <dl className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Source rows", datasetRows.total],
                  ["Valid pairs", datasetRows.valid_question_answer_pairs],
                  ["Unique questions", datasetRows.unique_normalized_questions],
                  ["Missing answers", qualityFlags?.missing_answer_rows],
                  ["Exact duplicates", qualityFlags?.exact_duplicate_rows_after_whitespace_normalization],
                  ["Multi-answer groups", audit?.question_groups],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-950/70 p-3">
                    <dt className="text-[11px] text-slate-500">{label}</dt>
                    <dd className="mt-1 text-xl font-semibold">{number(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : <p className="mt-6 text-sm text-slate-400">Run the dataset scripts to populate this panel.</p>}
            {audit && (
              <div className="mt-4 rounded-xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs leading-5 text-amber-100">
                {number(audit.groups_below_0_35_similarity)} multi-answer groups have low token similarity and should be reviewed before evaluation or future training.
              </div>
            )}
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-semibold">Question mix</h2>
            <p className="mt-1 text-xs text-slate-500">Rule-based categories</p>
            <div className="mt-6 space-y-3">
              {typeEntries.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[11px]"><span className="text-slate-300">{readableLabel(label)}</span><span className="text-slate-500">{number(value)}</span></div>
                  <div className="h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${Math.max((value / maxType) * 100, 2)}%` }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-semibold">Answer length</h2>
            <p className="mt-1 text-xs text-slate-500">Word-count distribution</p>
            <div className="mt-6 space-y-3">
              {lengthEntries.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[11px]"><span className="text-slate-300">{readableLabel(label)}</span><span className="text-slate-500">{number(value)}</span></div>
                  <div className="h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.max((value / maxLengthBand) * 100, 2)}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <p className="mt-6 text-right text-[11px] text-slate-600">
          {analytics.generatedAt ? `Updated ${new Date(analytics.generatedAt).toLocaleString()}` : "Waiting for analytics"}
        </p>
      </div>
    </main>
  );
}

export default AnalyticsDashboard;
