import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
export default function Home() {
  const { user } = useContext(AuthContext);
  return <main className="page home">
    <p className="eyebrow">EVIDENCE-LED HEALTH EXPLAINER</p>
    <h1>Health questions, with the sources in view.</h1>
    <p className="lead">Ask a question, explore a clear response, and see the PubMed records used to support medical answers.</p>
    <p>Keep your conversations organized and return to what you learned. You stay in control of your saved history.</p>
    <div className="actions"><Link className="button" to={user ? "/chat" : "/register"}>{user ? "Open chat" : "Create an account"}</Link><Link className="button secondary" to={user ? "/dashboard" : "/login"}>{user ? "View dashboard" : "Sign in"}</Link></div>
    <div className="notice">Educational use only. This project does not diagnose conditions or replace a qualified clinician. For urgent symptoms, contact local emergency services.</div>
    <section><h2>Built for informed exploration</h2><div className="feature-grid">
      {[["01", "Ask in plain language", "Start with a health topic or symptom question. Urgent messages receive immediate care guidance."], ["02", "Check the evidence", "Medical answers show PubMed links and an honest label when source support is limited."], ["03", "Pick up where you left off", "Search, rename, export, or delete your conversations from one workspace."]].map(([step, title, detail]) => <article className="card feature-card" key={title}><span className="feature-step">{step}</span><h3>{title}</h3><p>{detail}</p></article>)}
    </div></section>
    <section className="card trust-card"><div><span className="eyebrow">HOW IT WORKS</span><h2>Clear boundaries for every answer</h2></div><div><p>The server screens questions, retrieves PubMed literature for medical topics, and saves the completed exchange to your account. Provider keys stay on the server.</p><p>Source links and citation numbers help you inspect an answer; they do not prove clinical correctness. The LoRA research tools are separate from this app.</p></div></section>
    <section><h2>Frequently asked questions</h2><div className="feature-grid">
      {[["Is this a clinical diagnostic tool?", "No. MedAssist AI helps you explore health information and PubMed records. Discuss personal diagnosis, prescriptions, and care decisions with a qualified clinician."], ["How are PubMed records retrieved?", "For medical topics, the server searches NCBI PubMed and links the matching records beneath the answer. PubMed indexing does not guarantee that every record is peer reviewed or that an answer is clinically correct."], ["What happens to my questions and keys?", "Conversations are stored in the application database and scoped to your account. Medical search terms go to PubMed; prompts may go to your selected model provider. Personal API keys are encrypted on the server. You can export or delete your saved conversations."]].map(([question, answer]) => <article className="card feature-card" key={question}><h3>{question}</h3><p className="muted small-text">{answer}</p></article>)}
    </div></section>
  </main>;
}
