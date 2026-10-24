import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.16),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
        <section>
          <div className="mb-6 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Evidence-aware medical Q&amp;A
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Health conversations with visible sources and safer guardrails.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Explore medical questions, review PubMed references, keep persistent chat history, and monitor usage through a live analytics dashboard.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
              Create account
            </Link>
            <Link to="/login" className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500">
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            For information only. This application does not diagnose or replace professional care.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <p className="text-sm font-medium">Grounded response</p>
              <p className="text-xs text-slate-500">Medical workflow preview</p>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">3 sources</span>
          </div>
          <div className="mt-5 space-y-4">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 p-4 text-sm">
              What information should I discuss with a clinician about recurring migraines?
            </div>
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-slate-700 bg-slate-950/80 p-4 text-sm leading-6 text-slate-300">
              Track timing, symptoms, possible triggers, medicines, and how attacks affect daily activity. A clinician can use that history to assess next steps.
              <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-cyan-300">PubMed sources attached</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[["16.4K", "Q&A rows"], ["Live", "analytics"], ["Private", "history"]].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-slate-950/70 p-3">
                <p className="font-semibold text-white">{value}</p>
                <p className="mt-1 text-[11px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Home;
