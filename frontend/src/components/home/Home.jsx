import { Link } from "react-router-dom";

const features = [
  ["Medical chat", "Ask health questions and review relevant PubMed sources with the answer."],
  ["Saved history", "Keep your conversations, search them, rename them, and export a copy."],
  ["Safety checks", "The backend checks harmful prompts and adds medical safety reminders."],
  ["Simple dashboard", "View chat activity, citation coverage, and dataset statistics."],
];

function Home() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 text-white">
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="mb-4 text-sm font-semibold text-blue-400">Student full-stack project</p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            MedAssist AI
          </h1>
          <p className="mt-3 text-xl text-slate-300">
            A medical question-and-answer app with PubMed references.
          </p>
          <p className="mt-5 max-w-xl leading-7 text-slate-400">
            This project combines a React chat interface, Node.js API, MongoDB chat history,
            basic safety checks, medical source retrieval, and a small analytics dashboard.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-md bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500">
              Try the project
            </Link>
            <Link to="/login" className="rounded-md border border-slate-600 px-5 py-3 font-semibold hover:bg-slate-800">
              Sign in
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            Educational use only. It does not diagnose conditions or replace a doctor.
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <p className="font-semibold">Example chat</p>
              <p className="text-xs text-slate-500">Medical response preview</p>
            </div>
            <span className="rounded bg-emerald-950 px-2 py-1 text-xs text-emerald-300">Sources attached</span>
          </div>
          <div className="ml-auto max-w-[88%] rounded-lg bg-blue-600 p-4 text-sm">
            What should I track before speaking to a doctor about migraines?
          </div>
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm leading-6 text-slate-300">
            Note the timing, symptoms, possible triggers, medicines, and the effect on daily
            activities. Share this history with a qualified clinician.
            <p className="mt-3 border-t border-slate-700 pt-3 text-xs text-blue-300">
              PubMed references appear here
            </p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-slate-800 p-3"><strong className="block text-base">16.4K</strong><span className="text-slate-500">Q&amp;A rows</span></div>
            <div className="rounded-md bg-slate-800 p-3"><strong className="block text-base">CRUD</strong><span className="text-slate-500">chat history</span></div>
            <div className="rounded-md bg-slate-800 p-3"><strong className="block text-base">Live</strong><span className="text-slate-500">dashboard</span></div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold">What I built</h2>
          <p className="mt-2 text-sm text-slate-400">Main features included in this project upgrade.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(([title, description]) => (
              <article key={title} className="rounded-lg border border-slate-700 bg-slate-900 p-5">
                <h3 className="font-semibold text-blue-300">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-bold">How a medical question works</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            ["1", "Check", "Validate the prompt and apply the safety filter."],
            ["2", "Search", "Find relevant medical records using PubMed."],
            ["3", "Show sources", "Return the response with references and citation status."],
          ].map(([step, title, description]) => (
            <article key={step} className="rounded-lg border border-slate-700 p-5">
              <span className="text-sm font-bold text-blue-400">Step {step}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            </article>
          ))}
        </div>
        <p className="mt-10 text-sm text-slate-500">Developed by J Ganesh kumar reddy.</p>
      </section>
    </main>
  );
}

export default Home;
