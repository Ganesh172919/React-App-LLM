import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, downloadJson, downloadText } from "../../lib/api";
const number = (value) => new Intl.NumberFormat("en-IN").format(value || 0);
export default function AnalyticsDashboard() {
  const [data, setData] = useState(null); const [days, setDays] = useState(7); const [version, setVersion] = useState(0);
  const [status, setStatus] = useState("loading"); const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setStatus("loading"); setError("");
    apiRequest("/analytics/overview?days=" + days, { signal: controller.signal }).then((value) => { if (!controller.signal.aborted) { setData(value); setStatus("ready"); } }).catch((err) => { if (!controller.signal.aborted) { setStatus("error"); setError(err.message); } });
    return () => controller.abort();
  }, [days, version]);
  const exportCsv = () => {
    if (!data?.trend) return;
    const rows = [
      ["Date (UTC)", "New Conversations", "Q&A Exchanges"],
      ...data.trend.map((pt) => [pt.date, pt.sessions, pt.exchanges]),
    ];
    if (data.verification?.interactions?.length) {
      rows.push([]);
      rows.push(["Medication Interaction Pair", "Severity", "Alert Count"]);
      for (const item of data.verification.interactions) {
        rows.push([`"${item.pair}"`, item.severity, item.count]);
      }
    }
    const csvContent = rows.map((r) => r.join(",")).join("\n");
    downloadText(`medassist-activity-${data.rangeDays}d.csv`, csvContent, "text/csv;charset=utf-8");
  };
  const max = Math.max(1, ...(data?.trend || []).map((point) => point.exchanges));
  return <main className="page dashboard"><div className="row-between"><div><h1>Activity dashboard</h1><p className="muted">Your saved conversations and descriptive dataset statistics.</p></div><div className="actions" style={{ margin: 0 }}><button className="button secondary small" disabled={!data || status === "loading"} onClick={() => downloadJson("medassist-analytics.json", data)}>Export JSON</button><button className="button secondary small" disabled={!data || status === "loading"} onClick={exportCsv}>Export CSV</button><button className="button secondary small" disabled={!data || status === "loading"} onClick={() => window.print()}>Print</button></div></div>
    <div className="actions"><div><label htmlFor="activity-range">Activity range</label><select id="activity-range" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 90].map((value) => <option value={value} key={value}>Last {value} days</option>)}</select></div><button className="button secondary small" onClick={() => setVersion((value) => value + 1)} disabled={status === "loading"}>Refresh</button></div>
    {status === "loading" && <p role="status">Loading dashboard...</p>}{error && <p className="notice error" role="alert">{error}</p>}
    {data && <div aria-busy={status === "loading"}>
      {data.summary.totalSessions === 0 && <section className="card dashboard-empty"><div><h2>Your dashboard starts with a conversation</h2><p className="muted">Ask a health question to see saved activity and source information here.</p></div><Link className="button" to="/chat">Start a conversation</Link></section>}
      <h2>Lifetime totals</h2><div className="metrics">{[["Conversations", data.summary.totalSessions], ["Q&A exchanges", data.summary.totalMessages], ["Medical responses", data.summary.medicalResponses], ["Source links attached", data.summary.citations], ["Medical answers with sources", data.summary.medicalResponses ? data.summary.sourceAttachmentRate + "%" : "—"]].map(([label, value]) => <article className="card metric" key={label}><span>{label}</span><strong>{typeof value === "number" ? number(value) : value}</strong></article>)}</div>
      <p className="muted small-text">Totals cover all saved history. Source attachment measures available links, not factual correctness.</p>
      <section className="card"><h2>Recent activity · {data.rangeDays} days</h2><p className="muted small-text">Saved exchanges per day. Dates use UTC.</p><div className="activity-chart" role="img" aria-label={"Saved exchanges in the last " + data.rangeDays + " days"}>{data.trend.map((point) => <div className="bar-column" key={point.date} title={point.date + ": " + point.exchanges + " exchanges"}><span>{point.exchanges || ""}</span><div className="bar-space"><div className="bar" style={{ height: Math.max(2, point.exchanges / max * 100) + "%" }} /></div><span>{point.date.slice(5)}</span></div>)}</div>
        <details><summary>View activity as a table</summary><div className="table-scroll"><table><thead><tr><th>Date (UTC)</th><th>New conversations</th><th>Q&amp;A exchanges</th></tr></thead><tbody>{data.trend.map((point) => <tr key={point.date}><td>{point.date}</td><td>{point.sessions}</td><td>{point.exchanges}</td></tr>)}</tbody></table></div></details>
      </section>
      <div className="feature-grid"><section className="card"><h2>Answer outcomes</h2>{Object.keys(data.verification.statuses).length ? <table><thead><tr><th>Outcome</th><th>Responses</th></tr></thead><tbody>{Object.entries(data.verification.statuses).map(([label, count]) => <tr key={label}><td>{label.replaceAll("_", " ")}</td><td>{number(count)}</td></tr>)}</tbody></table> : <p className="muted">No saved answers yet.</p>}</section>
      {data.verification?.providers && Object.keys(data.verification.providers).length > 0 && <section className="card"><h2>AI providers</h2><table><thead><tr><th>Provider</th><th>Responses</th></tr></thead><tbody>{Object.entries(data.verification.providers).map(([provider, count]) => <tr key={provider}><td>{provider}</td><td>{number(count)}</td></tr>)}</tbody></table></section>}
      {data.verification?.interactions && data.verification.interactions.length > 0 && <section className="card"><h2>Medication interaction alerts</h2><table><thead><tr><th>Interaction pair</th><th>Severity</th><th>Alerts</th></tr></thead><tbody>{data.verification.interactions.map((item) => <tr key={item.pair}><td>{item.pair}</td><td><span className={`badge ${item.severity === "CRITICAL" ? "error" : "warning"}`}>{item.severity}</span></td><td>{number(item.count)}</td></tr>)}</tbody></table></section>}
      <section className="card"><h2>Dataset quality</h2>{data.dataset ? <><p className="muted small-text">Offline descriptive reports. These counts do not establish clinical accuracy.</p><table><tbody>{[["Source rows", data.dataset.rows.total], ["Valid Q&A pairs", data.dataset.rows.valid_question_answer_pairs], ["Missing answers", data.dataset.qualityFlags.missing_answer_rows], ["Exact duplicate pairs", data.dataset.qualityFlags.exact_duplicate_rows_after_whitespace_normalization], ["Multi-answer question groups", data.dataset.audit?.multipleAnswerQuestions.question_groups]].map(([label, value]) => <tr key={label}><th>{label}</th><td>{number(value)}</td></tr>)}</tbody></table><p className="muted small-text">Report generated: {data.dataset.generatedAt ? new Date(data.dataset.generatedAt).toLocaleString() : "Not recorded"}</p></> : <p className="notice">Dataset reports are unavailable in this deployment.</p>}</section></div>
    </div>}
  </main>;
}
