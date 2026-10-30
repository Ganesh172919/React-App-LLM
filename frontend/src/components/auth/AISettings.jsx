import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

const names = { gemini: "Gemini", groq: "Groq", together: "Together AI", local: "Local model" };
const choiceLabel = (choice) => choice.id === "deployment" ? `Deployment default (${names[choice.provider] || choice.provider})` : `${choice.source === "personal" ? "My key" : "Deployment"} · ${names[choice.provider] || choice.provider}`;

export default function AISettings() {
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [keyProvider, setKeyProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadVersion, setLoadVersion] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    apiRequest("/settings").then((data) => { if (active) { setSettings(data); setDraft({ providerChoice: data.providerChoice, answerStyle: data.answerStyle, audienceProfile: data.audienceProfile || "general", usePastChats: data.usePastChats }); } }).catch((err) => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadVersion]);
  const submit = async (action, success) => {
    setBusy(true); setError(""); setStatus("");
    try {
      const data = await action(); setSettings(data);
      if (success === "Preferences saved." || success === "API key removed.") setDraft({ providerChoice: data.providerChoice, answerStyle: data.answerStyle, audienceProfile: data.audienceProfile || "general", usePastChats: data.usePastChats });
      if (success === "API key saved.") setApiKey("");
      setStatus(success); setRemoving(null);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="card ai-settings"><h2>AI and memory settings</h2>
    <p className="muted">Choose where answers are generated and how much context is used. Medical questions still use PubMed records. Provider availability and free quotas depend on each provider account.</p>
    {error && <p className="notice error" role="alert">{error}</p>}
    {status && <p className="notice success" role="status">{status}</p>}
    {!settings || !draft ? loading ? <p role="status">Loading AI settings...</p> : <button className="button secondary" type="button" onClick={() => setLoadVersion((value) => value + 1)}>Retry loading settings</button> : <>
      {!settings.providerChoices.some((choice) => choice.available) && <p className="notice" role="status">No answer provider is ready. Add a personal key below or ask the operator to configure a deployment provider. Medical literature links may still be available.</p>}
      <form onSubmit={(event) => { event.preventDefault(); submit(() => apiRequest("/settings", { method: "PATCH", body: JSON.stringify(draft) }), "Preferences saved."); }}>
        <div className="settings-grid"><label>Answer provider<select value={draft.providerChoice} onChange={(event) => setDraft((old) => ({ ...old, providerChoice: event.target.value }))} disabled={busy}>{settings.providerChoices.map((choice) => <option key={choice.id} value={choice.id} disabled={!choice.available}>{choiceLabel(choice)}{choice.available ? "" : " · unavailable"}</option>)}</select></label>
          <label>Answer length<select value={draft.answerStyle} onChange={(event) => setDraft((old) => ({ ...old, answerStyle: event.target.value }))} disabled={busy}><option value="balanced">Balanced</option><option value="brief">Brief</option><option value="detailed">Detailed</option></select></label>
          <label>Audience profile<select value={draft.audienceProfile || "general"} onChange={(event) => setDraft((old) => ({ ...old, audienceProfile: event.target.value }))} disabled={busy}><option value="general">General (Patients &amp; public)</option><option value="student">Student (Biological mechanisms)</option><option value="clinician">Clinician (Pathophysiology &amp; pharmacology)</option></select></label></div>
        <label className="checkbox-label"><input type="checkbox" checked={draft.usePastChats} onChange={(event) => setDraft((old) => ({ ...old, usePastChats: event.target.checked }))} disabled={busy} />Use earlier conversations for general answers</label>
        <p className="muted small-text">Off by default. When on, up to two related exchanges from your other conversations may be sent to the selected answer provider. This uses word overlap and is never treated as medical evidence. You can turn it off at any time.</p>
        <button className="button" disabled={busy}>Save AI preferences</button>
      </form>
      <div className="settings-divider"><h3>Personal API keys</h3><p className="muted">Keys are encrypted on this server and are never shown again. Chat content is sent to the provider you select. An operator-enabled Gemini review may also receive medical drafts and PubMed abstracts. A provider may charge your account or apply rate limits.</p>
        {!settings.keyStorageAvailable ? <p className="notice">This deployment has not enabled encrypted personal-key storage. Ask the operator to configure it, or use an available deployment provider. You can still remove any previously saved key below.</p> :
          <form onSubmit={(event) => { event.preventDefault(); submit(() => apiRequest("/settings/keys/" + keyProvider, { method: "PUT", body: JSON.stringify({ apiKey }) }), "API key saved."); }}>
            <div className="settings-grid"><label>Provider<select value={keyProvider} onChange={(event) => setKeyProvider(event.target.value)} disabled={busy}><option value="gemini">Gemini</option><option value="groq">Groq</option><option value="together">Together AI</option></select></label>
              <label>API key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" minLength={12} maxLength={512} required disabled={busy} placeholder="Paste your provider key" /></label></div>
            <button className="button secondary" disabled={busy || !apiKey.trim()}>Save key securely</button>
          </form>}
        {settings.personalKeys.length > 0 && <ul className="key-list">{settings.personalKeys.map((item) => <li key={item.provider}><span>{names[item.provider]} key ending in <strong>{item.lastFour}</strong></span>{removing === item.provider ? <span className="actions"><button className="button danger small" type="button" disabled={busy} onClick={() => submit(() => apiRequest("/settings/keys/" + item.provider, { method: "DELETE" }), "API key removed.")}>Confirm removal</button><button className="button secondary small" type="button" onClick={() => setRemoving(null)}>Cancel</button></span> : <button className="text-button" type="button" onClick={() => setRemoving(item.provider)}>Remove key</button>}</li>)}</ul>}
        <p className="muted small-text">Keys are saved without contacting the provider. After saving one, select “My key” in Answer provider and save your preferences. Removing a selected key switches back to the deployment default.</p>
      </div>
    </>}
  </section>;
}
