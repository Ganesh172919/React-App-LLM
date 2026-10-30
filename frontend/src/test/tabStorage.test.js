import { afterEach, expect, it, vi } from "vitest";
import { readTab, writeTab, readPending } from "../lib/tabStorage";
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });
it("a blocked storage API never crashes draft reads or writes", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
  expect(readTab("draft")).toBe(""); expect(() => writeTab("draft", "question")).not.toThrow();
});
it("expired or malformed pending data is not restored", () => {
  sessionStorage.setItem("pending", JSON.stringify({ prompt: "old", exchangeId: "id", storedAt: Date.now() - 2 * 86400000 }));
  expect(readPending("pending")).toBeNull(); sessionStorage.setItem("pending", "bad JSON"); expect(readPending("pending")).toBeNull();
});
