/**
 * ============================================================================
 * MEDASSIST AI - CLIENT API & WEBSOCKET CLIENT UTILITIES (api.js)
 * ============================================================================
 * Role:
 *   Centralized HTTP fetch client and WebSocket URL resolver for the frontend.
 *   Enforces cookie inclusion (`credentials: "include"`) for JWT transmission,
 *   auto-configures JSON headers, parses JSON responses, and normalizes error objects.
 *
 * Functions:
 *   - `API_BASE_URL`: Resolves `import.meta.env.VITE_API_URL` or defaults to `http://localhost:5000/api`.
 *   - `apiRequest(path, options)`: Wrapper around `fetch()` that standardizes credentials,
 *     Content-Type headers, error status unwrapping, and JSON parsing.
 *   - `getWebSocketUrl()`: Automatically maps the HTTP API URL to its WebSocket counterpart
 *     (`http -> ws`, `https -> wss`, `/api -> /ws`).
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: API CLIENT ARCHITECTURE
 * ----------------------------------------------------------------------------
 * [api.js Utility]
 *   │
 *   ├── 1. URL Configuration
 *   │     ├── API_BASE_URL: VITE_API_URL || "http://localhost:5000/api"
 *   │     └── getWebSocketUrl(): VITE_WS_URL || replaces http/api with ws
 *   │
 *   └── 2. apiRequest(path, options)
 *         ├── Injects credentials: "include" (transmits accessToken cookie)
 *         ├── Conditionally attaches "Content-Type": "application/json" if body is present
 *         ├── Executes window.fetch(`${API_BASE_URL}${path}`)
 *         ├── Parses JSON payload if content-type header indicates JSON
 *         ├── If response.ok === false: throws Error with status and data attached
 *         └── Returns parsed data payload
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: CLIENT HTTP REQUEST PIPELINE
 * ----------------------------------------------------------------------------
 *  Component ──► apiRequest('/history')
 *                      │
 *                      ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ fetch(`${API_BASE_URL}/history`, {                     │
 *  │   credentials: "include",                              │
 *  │   headers: { "Content-Type": "application/json" }      │
 *  │ })                                                     │
 *  └────────────────────────────────────────────────────────┘
 *                      │
 *                      ▼
 *          (response.ok === true?)
 *                      │
 *             ┌────────┴────────┐
 *             ▼                 ▼
 *           [Yes]             [No]
 *             │                 │
 *             ▼                 ▼
 *        return data    throw Error(status, data)
 * ============================================================================
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

/**
 * ----------------------------------------------------------------------------
 * FUNCTION: apiRequest
 * ----------------------------------------------------------------------------
 * Unified fetch wrapper with credentials: "include", JSON headers, and status unwrapping.
 *
 * @param {string} path - API endpoint path (e.g. "/history").
 * @param {RequestInit} [options] - Standard fetch options.
 * @returns {Promise<any>} Parsed JSON response payload.
 */
export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * ----------------------------------------------------------------------------
 * FUNCTION: getWebSocketUrl
 * ----------------------------------------------------------------------------
 * Derives the active WebSocket server URL from VITE_WS_URL or VITE_API_URL.
 *
 * @returns {string} WebSocket URL (ws://... or wss://...).
 */
export const getWebSocketUrl = () => {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return configured;
  if (API_BASE_URL.startsWith("http")) {
    return API_BASE_URL.replace(/^http/, "ws").replace(/\/api$/, "/ws");
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};
