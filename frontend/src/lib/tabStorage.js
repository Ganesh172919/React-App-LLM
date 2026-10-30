// Tab storage is optional: restricted/private browser contexts must remain usable.
export function readTab(key, fallback = "") {
  try { return sessionStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
export function writeTab(key, value) {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* Keep the current in-memory draft. */ }
}
export function readPending(key) {
  try {
    const value = JSON.parse(readTab(key, "null"));
    if (!value || typeof value.prompt !== "string" || typeof value.exchangeId !== "string" || !Number.isFinite(value.storedAt) || Date.now() - value.storedAt > 86400000) return null;
    if (value.result && (typeof value.result.text !== "string" || typeof value.result.generationId !== "string" || !Array.isArray(value.result.references || []))) return null;
    return value;
  } catch { return null; }
}
