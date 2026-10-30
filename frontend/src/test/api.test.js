import { afterEach, expect, it, vi } from "vitest";
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
const response = (status, body) => ({ ok: status < 400, status, headers: new Headers({ "content-type": "application/json" }), json: async () => body });
it("concurrent expired requests share one refresh and retry once", async () => {
  let refreshes = 0; let refreshed = false;
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    if (url.endsWith("/auth/refresh-token")) { refreshes++; await new Promise((resolve) => setTimeout(resolve, 10)); refreshed = true; return response(200, { user: { id: "test" } }); }
    return refreshed ? response(200, { items: [] }) : response(401, { code: "ACCESS_EXPIRED" });
  }));
  const { apiRequest } = await import("../lib/api");
  await Promise.all([apiRequest("/history"), apiRequest("/history")]); expect(refreshes).toBe(1);
});
it("a forbidden request never triggers refresh or another generation", async () => {
  const fetch = vi.fn(async () => response(403, { message: "Forbidden" })); vi.stubGlobal("fetch", fetch);
  const { apiRequest } = await import("../lib/api"); await expect(apiRequest("/ai/chat")).rejects.toMatchObject({ status: 403 }); expect(fetch).toHaveBeenCalledTimes(1);
});
it("a failed refresh ends the session without an infinite retry", async () => {
  const fetch = vi.fn(async () => response(401, { message: "Session expired" })); vi.stubGlobal("fetch", fetch);
  const ended = vi.fn(); window.addEventListener("session-ended", ended);
  const { apiRequest } = await import("../lib/api"); await expect(apiRequest("/history")).rejects.toMatchObject({ status: 401 }); expect(fetch).toHaveBeenCalledTimes(2); expect(ended).toHaveBeenCalledTimes(1);
  window.removeEventListener("session-ended", ended);
});
