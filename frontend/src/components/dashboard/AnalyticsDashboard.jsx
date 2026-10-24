import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/api";

const EMPTY_ANALYTICS = {
  summary: {
    totalSessions: 0,
    totalMessages: 0,
    medicalSessions: 0,
    citedResponses: 0,
    citations: 0,
    averageMessagesPerSession: 0,
  },
  breakdown: [],
  trend: [],
  dataset: null,
};

const number = (value) => new Intl.NumberFormat("en-IN").format(value || 0);

function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [status, setStatus] = useState("loading");

  const loadAnalytics = async () => {
    setStatus("loading");
    try {
      const data = await apiRequest("/analytics/overview");
      setAnalytics(data);
      setStatus("ready");
    } catch (error) {
      console.error("Analytics request failed:", error);
      setStatus("error");
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const chart = useMemo(() => {
    const values = analytics.trend.map((point) => point.messages);
    const max = Math.max(...values, 1);
    const points = analytics.trend.map((point, index) => ({
      ...point,
      x: analytics.trend.length > 1 ? 18 + (index * 264) / (analytics.trend.length - 1) : 150,
      y: 112 - (point.messages / max) * 86,
    }));
    return {
      points,
      path: points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" "),
    };
  }, [analytics.trend]);

  const summaryCards = [
    ["Chat sessions", analytics.summary.totalSessions, "Saved conversations"],
    ["Q&A pairs", analytics.summary.totalMessages, "Persistent history"],
    ["Medical sessions", analytics.summary.medicalSessions, "PubMed-routed chats"],
    ["Citations shown", analytics.summary.citations, "Source links returned"],
  ];

  const datasetRows = analytics.dataset?.rows;
  const qualityFlags = analytics.dataset?.qualityFlags;
  const typeEntries = Object.entries(analytics.dataset?.questionTypes || {}).slice(0, 6);
  const maxType = Math.max(...typeEntries.map(([, value]) => value), 1);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-400">
              AI operations
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Analytics dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Conversation activity, medical grounding coverage, and the current Q&amp;A dataset profile.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            disabled={status === "loading"}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium hover:border-cyan-500 disabled:opacity-50"
          >
            {status === "loading" ? "Refreshing…" : "Refresh data"}
          </button>
        </div>

        {status === "error" && (
          <div className="mb-6 rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-200">
            Analytics could not be loaded. Confirm the API and MongoDB are running, then retry.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
          {summaryCards.map(([label, value, note]) => (
            <article key={label} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{number(value)}</p>
              <p className="mt-2 text-xs text-slate-500">{note}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Message activity</h2>
                <p className="text-xs text-slate-500">Last seven UTC days</p>
              </div>
              <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                {number(analytics.summary.averageMessagesPerSession)} per session
              </span>
            </div>
            <svg className="mt-6 h-64 w-full" viewBox="0 0 300 145" role="img" aria-label="Messages during the last seven days">
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[26, 55, 84, 112].map((y) => (
                <line key={y} x1="18" x2="282" y1={y} y2={y} stroke="#334155" strokeWidth="0.6" />
              ))}
              {chart.path && <path d={`${chart.path} L282,120 L18,120 Z`} fill="url(#activityFill)" />}
              {chart.path && <path d={chart.path} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />}
              {chart.points.map((point) => (
                <g key={point.date}>
                  <circle cx={point.x} cy={point.y} r="3" fill="#0f172a" stroke="#67e8f9" strokeWidth="2" />
                  <text x={point.x} y="138" textAnchor="middle" fill="#94a3b8" fontSize="7">
                    {new Date(`${point.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}
                  </text>
                </g>
              ))}
            </svg>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <h2 className="font-semibold">Grounding coverage</h2>
            <p className="mt-1 text-xs text-slate-500">Responses that include PubMed references</p>
            <div className="mt-8 flex items-center justify-center">
              <div
                className="grid h-44 w-44 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#22d3ee ${analytics.summary.medicalResponses ? (analytics.summary.citedResponses / analytics.summary.medicalResponses) * 100 : 0}%, #1e293b 0)`,
                }}
              >
                <div className="grid h-32 w-32 place-items-center rounded-full bg-slate-900 text-center">
                  <div>
                    <p className="text-3xl font-semibold">
                      {analytics.summary.medicalResponses
                        ? Math.round((analytics.summary.citedResponses / analytics.summary.medicalResponses) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-slate-500">cited</p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Dataset quality</h2>
                <p className="mt-1 text-xs text-slate-500">MEDQUAD-style question-answer CSV profile</p>
              </div>
              <span className="rounded-lg bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">No training run</span>
            </div>
            {datasetRows ? (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ["Source rows", datasetRows.total],
                  ["Valid pairs", datasetRows.valid_question_answer_pairs],
                  ["Unique questions", datasetRows.unique_normalized_questions],
                  ["Missing answers", qualityFlags?.missing_answer_rows],
                  ["Exact duplicates", qualityFlags?.exact_duplicate_rows_after_whitespace_normalization],
                  ["Repeated questions", qualityFlags?.repeated_question_rows],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-950/70 p-4">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold">{number(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-400">Run the dataset analysis script to populate this panel.</p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <h2 className="font-semibold">Question mix</h2>
            <p className="mt-1 text-xs text-slate-500">Rule-based categories from the analysis report</p>
            <div className="mt-6 space-y-4">
              {typeEntries.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="capitalize text-slate-300">{label}</span>
                    <span className="text-slate-500">{number(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${Math.max((value / maxType) * 100, 2)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default AnalyticsDashboard;
