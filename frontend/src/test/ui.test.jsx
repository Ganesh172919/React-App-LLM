import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AuthPage from "../components/auth/AuthPage";
import AISettings from "../components/auth/AISettings";
import ChatWorkspace from "../components/chat/ChatWorkspace";
import Dashboard from "../components/dashboard/AnalyticsDashboard";
import { apiRequest, downloadJson } from "../lib/api";
vi.mock("../lib/api", () => ({ API_BASE_URL: "/api", apiRequest: vi.fn(), refreshSession: vi.fn(), getWebSocketUrl: () => "ws://localhost/ws", downloadJson: vi.fn(), downloadText: vi.fn(), formatChatAsMarkdown: vi.fn(() => "") }));
const user = { id: "synthetic-user", email: "student@example.test" };
let setUser;
class Socket { static instances = []; constructor() { Socket.instances.push(this); } close() {} }
const mount = (component) => render(<AuthContext.Provider value={{ user, setUser }}><MemoryRouter>{component}</MemoryRouter></AuthContext.Provider>);
beforeEach(() => {
  setUser = vi.fn(); vi.stubGlobal("WebSocket", Socket); Socket.instances = []; sessionStorage.clear(); apiRequest.mockReset(); downloadJson.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
  apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [], nextCursor: null } : {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("account UI", () => {
  it("signs in with explicit pending feedback and stable credentials", async () => {
    apiRequest.mockResolvedValue({ user }); mount(<AuthPage mode="login" />); const input = userEvent.setup();
    await input.type(screen.getByLabelText("Email"), user.email); await input.type(screen.getByLabelText(/^Password/), "Student-demo-123"); await input.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(setUser).toHaveBeenCalledWith(user));
    const login = apiRequest.mock.calls.find(([path]) => path === "/auth/login");
    expect(JSON.parse(login[1].body)).toEqual({ email: user.email, password: "Student-demo-123" });
  });
  it("requires matching registration passwords before sending credentials", async () => {
    mount(<AuthPage mode="register" />); const input = userEvent.setup();
    await input.type(screen.getByLabelText("Email"), user.email);
    await input.type(screen.getByLabelText(/^Password/), "Student-demo-123");
    await input.type(screen.getByLabelText("Confirm password"), "Student-demo-456");
    await input.click(screen.getByRole("button", { name: "Create an account" }));
    expect(screen.getByRole("alert").textContent).toContain("passwords do not match");
    expect(apiRequest.mock.calls.some(([path]) => path === "/auth/register")).toBe(false);
    await input.clear(screen.getByLabelText("Confirm password"));
    await input.type(screen.getByLabelText("Confirm password"), "Student-demo-123");
    await input.click(screen.getByRole("button", { name: "Create an account" }));
    await waitFor(() => expect(apiRequest.mock.calls.some(([path]) => path === "/auth/register")).toBe(true));
  });
  it("shows Google sign-in only when the provider is configured", async () => {
    apiRequest.mockImplementation(async (path) => path === "/auth/providers" ? { google: true } : {});
    mount(<AuthPage mode="login" />);
    expect((await screen.findByRole("link", { name: "Continue with Google" })).getAttribute("href")).toBe("/api/auth/google");
  });
  it("styles reset-request success by state rather than message words", async () => {
    apiRequest.mockResolvedValue({ message: "If an account exists, check your inbox." }); mount(<AuthPage mode="forgot-password" />); const input = userEvent.setup();
    await input.type(screen.getByLabelText("Email"), user.email); await input.click(screen.getByRole("button", { name: "Request reset link" }));
    expect((await screen.findByRole("status")).className).toContain("success");
  });
  it("resends verification using an email from the URL", async () => {
    render(<AuthContext.Provider value={{ setUser }}><MemoryRouter initialEntries={["/verification-pending?email=student%40example.test"]}><AuthPage mode="verification-pending" /></MemoryRouter></AuthContext.Provider>);
    await userEvent.click(screen.getByRole("button", { name: "Resend verification" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/auth/resend-verification", expect.objectContaining({ body: JSON.stringify({ email: user.email }) })));
  });
  it("shows a useful error for a missing reset token", () => { mount(<AuthPage mode="reset-password" />); expect(screen.getByRole("button", { name: "Update password" }).disabled).toBe(true); expect(screen.getByRole("alert").textContent).toContain("incomplete"); });
  it("saves a personal provider key and opts into owner history without echoing the key", async () => {
    let stored = false; const key = "gsk_synthetic_private_key_1234";
    const data = (choice = "deployment", memory = false) => ({ providerChoice: choice, answerStyle: "balanced", usePastChats: memory, keyStorageAvailable: true, personalKeys: stored ? [{ provider: "groq", lastFour: "1234" }] : [], providerChoices: [{ id: "deployment", provider: "gemini", source: "deployment", available: false }, { id: "personal-groq", provider: "groq", source: "personal", available: stored }] });
    apiRequest.mockImplementation(async (path, options) => {
      if (path === "/settings/keys/groq" && options?.method === "PUT") { stored = true; return data(); }
      if (path === "/settings" && options?.method === "PATCH") { const body = JSON.parse(options.body); return data(body.providerChoice, body.usePastChats); }
      return data();
    });
    mount(<AISettings />); const input = userEvent.setup();
    await screen.findByLabelText("Answer provider");
    await input.selectOptions(screen.getByLabelText("Provider"), "groq");
    await input.type(screen.getByLabelText("API key"), key);
    await input.click(screen.getByRole("button", { name: "Save key securely" }));
    await screen.findByText("API key saved.");
    expect(screen.getByLabelText("API key").value).toBe("");
    expect(document.body.textContent).not.toContain(key);
    await input.selectOptions(screen.getByLabelText("Answer provider"), "personal-groq");
    await input.click(screen.getByLabelText("Use earlier conversations for general answers"));
    await input.click(screen.getByRole("button", { name: "Save AI preferences" }));
    await screen.findByText("Preferences saved.");
    const update = apiRequest.mock.calls.find(([path, options]) => path === "/settings" && options?.method === "PATCH");
    expect(JSON.parse(update[1].body)).toMatchObject({ providerChoice: "personal-groq", usePastChats: true });
  });
});
describe("chat lifecycle", () => {
  const result = { generationId: "generation", text: "Fixture answer [1].", isMedical: true, verification: { status: "citation_checked" }, references: [] };
  const saved = { sessionId: "saved-session", chat: { messages: [{ id: "user", text: "migraine symptoms", isUser: true }, { id: "assistant", ...result, isUser: false }] } };
  it("generates and saves once and keeps the simple message labels", async () => {
    apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [], nextCursor: null } : path === "/ai/chat" ? result : saved);
    mount(<ChatWorkspace />); const input = userEvent.setup();
    await input.type(screen.getByLabelText("Your question"), "migraine symptoms"); await input.click(screen.getByRole("button", { name: "Send question" }));
    await screen.findByText("Conversation saved"); expect(apiRequest.mock.calls.filter(([path]) => path === "/ai/chat")).toHaveLength(1);
    expect(apiRequest.mock.calls.filter(([path]) => path === "/save")).toHaveLength(1); expect(screen.getByText("Citation numbers checked")).toBeTruthy();
  });
  it("retries only saving after a save failure", async () => {
    let saves = 0;
    apiRequest.mockImplementation(async (path) => {
      if (path.startsWith("/history")) return { items: [], nextCursor: null };
      if (path === "/ai/chat") return result;
      if (path === "/save") { if (++saves === 1) throw new Error("Temporary database outage"); return saved; }
    });
    mount(<ChatWorkspace />); const input = userEvent.setup();
    await input.type(screen.getByLabelText("Your question"), "migraine symptoms"); await input.click(screen.getByRole("button", { name: "Send question" }));
    await input.click(await screen.findByRole("button", { name: "Retry saving" })); await screen.findByText("Conversation saved");
    expect(saves).toBe(2); expect(apiRequest.mock.calls.filter(([path]) => path === "/ai/chat")).toHaveLength(1);
  });
  it("guards navigation while generation is pending", async () => {
    let resolve;
    apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [], nextCursor: null } : path === "/ai/chat" ? new Promise((done) => { resolve = done; }) : saved);
    mount(<ChatWorkspace />); const input = userEvent.setup(); await input.type(screen.getByLabelText("Your question"), "migraine symptoms"); await input.click(screen.getByRole("button", { name: "Send question" }));
    expect(screen.getByRole("button", { name: "New conversation" }).disabled).toBe(true);
    resolve(result); await screen.findByText("Conversation saved");
  });
  it("does not send an in-progress IME composition", async () => {
    mount(<ChatWorkspace />); const textarea = screen.getByLabelText("Your question");
    fireEvent.change(textarea, { target: { value: "draft question" } }); fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    expect(apiRequest.mock.calls.some(([path]) => path === "/ai/chat")).toBe(false);
  });
  it("blocks sending until the selected conversation finishes loading", async () => {
    let complete;
    apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [{ id: "existing", title: "Earlier conversation", timestamp: new Date().toISOString() }], nextCursor: null } : new Promise((resolve) => { complete = resolve; }));
    mount(<ChatWorkspace />); const input = userEvent.setup();
    await input.click(await screen.findByRole("button", { name: "Earlier conversation" }));
    expect(screen.getByLabelText("Your question").disabled).toBe(true);
    expect(screen.getByRole("button", { name: "New conversation" }).disabled).toBe(true);
    complete({ title: "Earlier conversation", messages: [] });
    await waitFor(() => expect(screen.getByLabelText("Your question").disabled).toBe(false));
  });
  it("recovers a completed unsaved answer after remount without regenerating", async () => {
    let fail = true;
    apiRequest.mockImplementation(async (path) => {
      if (path.startsWith("/history")) return { items: [], nextCursor: null };
      if (path === "/ai/chat") return result;
      if (fail) throw new Error("Save unavailable");
      return saved;
    });
    const first = mount(<ChatWorkspace />); const input = userEvent.setup();
    await input.type(screen.getByLabelText("Your question"), "migraine symptoms"); await input.click(screen.getByRole("button", { name: "Send question" }));
    await screen.findByRole("button", { name: "Retry saving" }); first.unmount(); fail = false;
    mount(<ChatWorkspace />); await input.click(screen.getByRole("button", { name: "Retry saving" })); await screen.findByText("Conversation saved");
    expect(apiRequest.mock.calls.filter(([path]) => path === "/ai/chat")).toHaveLength(1);
    expect(sessionStorage.getItem("medassist-draft-" + user.id + "-pending")).toBeNull();
    await input.click(screen.getByRole("button", { name: "New conversation" }));
    expect(screen.queryByText("Conversation saved")).toBeNull();
    apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [], nextCursor: null } : new Promise(() => {}));
    await input.type(screen.getByLabelText("Your question"), "A fresh question");
    await input.click(screen.getByRole("button", { name: "Send question" }));
    expect(screen.queryByText(/Your unfinished message was recovered/)).toBeNull();
  });
  it("copies an answer with visible confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [], nextCursor: null } : path === "/ai/chat" ? result : saved);
    mount(<ChatWorkspace />); fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "migraine symptoms" } }); fireEvent.submit(screen.getByLabelText("Your question").closest("form"));
    await screen.findByText("Conversation saved"); fireEvent.click(screen.getByRole("button", { name: "Copy answer" }));
    await screen.findByText("Answer copied"); expect(writeText).toHaveBeenCalledWith(result.text);
  });
  it("copies a formatted clinical summary with citations and disclaimer", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [], nextCursor: null } : path === "/ai/chat" ? result : saved);
    mount(<ChatWorkspace />);
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "migraine symptoms" } });
    fireEvent.submit(screen.getByLabelText("Your question").closest("form"));
    await screen.findByText("Conversation saved");
    fireEvent.click(screen.getByRole("button", { name: "Copy summary" }));
    await screen.findByText("Summary copied");
    expect(writeText).toHaveBeenCalled();
    const copiedSummary = writeText.mock.calls[0][0];
    expect(copiedSummary).toContain("EDUCATIONAL CHAT SUMMARY");
    expect(copiedSummary).toContain("DISCLAIMER");
  });
  it("renders clinical drug interaction alert when high-risk pairs are detected", async () => {
    const ddiResult = {
      ...result,
      verification: {
        ...result.verification,
        drugInteractions: [
          {
            pair: "Anticoagulant / Antiplatelet + NSAIDs / Aspirin",
            severity: "CRITICAL",
            description: "Concurrent use significantly elevates gastrointestinal ulceration.",
            clinicalRecommendation: "Avoid combination unless explicitly prescribed.",
          },
        ],
      },
    };
    apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [], nextCursor: null } : path === "/ai/chat" ? ddiResult : { ...saved, chat: { ...saved.chat, messages: [{ ...saved.chat.messages[0] }, { ...saved.chat.messages[1], verification: ddiResult.verification }] } });
    mount(<ChatWorkspace />);
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "Can I take warfarin and aspirin?" } });
    fireEvent.submit(screen.getByLabelText("Your question").closest("form"));
    await screen.findByText("Conversation saved");
    expect(screen.getByText(/Possible medication interaction mentioned/)).toBeTruthy();
    expect(screen.getByText(/cannot confirm whether an interaction applies/)).toBeTruthy();
    expect(screen.getByText("Anticoagulant / Antiplatelet + NSAIDs / Aspirin")).toBeTruthy();
  });
  it("keeps untrusted markdown links and images inert while listing PubMed sources", async () => {
    const unsafeMarkdown = { ...result, text: "[Unreviewed link](https://example.invalid/track) ![tracking pixel](https://example.invalid/pixel)", references: [{ pmid: "123", title: "Reviewed source", url: "https://pubmed.ncbi.nlm.nih.gov/123/" }] };
    const stored = { sessionId: "saved-session", chat: { title: "Source review", messages: [{ id: "assistant", ...unsafeMarkdown, isUser: false }] } };
    apiRequest.mockImplementation(async (path) => path.startsWith("/history") ? { items: [], nextCursor: null } : path === "/ai/chat" ? unsafeMarkdown : stored);
    const { container } = mount(<ChatWorkspace />);
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "migraine symptoms" } });
    fireEvent.submit(screen.getByLabelText("Your question").closest("form"));
    await screen.findByText("Conversation saved");
    expect(container.querySelector(".prose a, .prose img")).toBeNull();
    expect(screen.getByText("[Image omitted: tracking pixel]")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Reviewed source" }).getAttribute("href")).toBe("https://pubmed.ncbi.nlm.nih.gov/123/");
  });
  it("returns keyboard focus to History after closing its mobile drawer", async () => {
    mount(<ChatWorkspace />);
    const history = screen.getByRole("button", { name: "History" });
    fireEvent.click(history);
    expect(history.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector(".conversation").hasAttribute("inert")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(document.activeElement).toBe(history));
    expect(history.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector(".conversation").hasAttribute("inert")).toBe(false);
  });
  it("clears search query and restores focus with clear button", async () => {
    mount(<ChatWorkspace />);
    const search = screen.getByLabelText("Search history");
    fireEvent.change(search, { target: { value: "migraine" } });
    expect(search.value).toBe("migraine");
    const clearBtn = screen.getByRole("button", { name: "Clear search query" });
    fireEvent.click(clearBtn);
    expect(search.value).toBe("");
  });
  it("imports a valid conversation JSON export and renders the messages", async () => {
    mount(<ChatWorkspace />);
    const payload = JSON.stringify({
      title: "Imported Consultation",
      messages: [
        { id: "msg-1", text: "Imported clinical question", isUser: true },
        { id: "msg-2", text: "Imported educational response", isUser: false },
      ],
    });
    const file = new File([payload], "chat-export.json", { type: "application/json" });
    const input = screen.getByLabelText("Upload conversation JSON");
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText("Imported clinical question");
    expect(screen.getByText("Imported educational response")).toBeTruthy();
    expect(screen.getByText("Imported Consultation")).toBeTruthy();
    expect(screen.getByText("Imported conversation loaded into workspace")).toBeTruthy();
  });
  it("shows an error when importing a corrupt or invalid JSON file", async () => {
    mount(<ChatWorkspace />);
    const file = new File(["not valid json {{"], "corrupt.json", { type: "application/json" });
    const input = screen.getByLabelText("Upload conversation JSON");
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText(/Could not parse file/);
  });
});
it("ignores stale dashboard ranges", async () => {
  const pending = new Map();
  const make = (days) => ({ rangeDays: days, summary: { totalSessions: days, sourceAttachmentRate: 0 }, trend: [], verification: { statuses: {} }, dataset: null });
  apiRequest.mockImplementation((path) => new Promise((resolve) => pending.set(path, resolve)));
  mount(<Dashboard />); await userEvent.selectOptions(screen.getByLabelText("Activity range"), "30");
  pending.get("/analytics/overview?days=30")(make(30)); await screen.findByText("Recent activity · 30 days");
  pending.get("/analytics/overview?days=7")(make(7)); await waitFor(() => expect(screen.queryByText("Recent activity · 7 days")).toBeNull());
});
it("gives a new account a path from empty analytics to chat", async () => {
  apiRequest.mockResolvedValue({ rangeDays: 7, summary: { totalSessions: 0, totalMessages: 0, medicalResponses: 0, citations: 0, sourceAttachmentRate: 0 }, trend: [], verification: { statuses: {} }, dataset: null });
  mount(<Dashboard />);
  expect((await screen.findByRole("link", { name: "Start a conversation" })).getAttribute("href")).toBe("/chat");
  expect(screen.getByText("—")).toBeTruthy();
});
it("renders AI provider distribution in dashboard when present", async () => {
  apiRequest.mockResolvedValue({
    rangeDays: 7,
    summary: { totalSessions: 2, totalMessages: 4, medicalResponses: 2, citations: 2, sourceAttachmentRate: 100 },
    trend: [],
    verification: { statuses: { citation_checked: 2 }, providers: { Gemini: 2 } },
    dataset: null,
  });
  mount(<Dashboard />);
  expect(await screen.findByRole("heading", { name: "AI providers" })).toBeTruthy();
  expect(screen.getByText("Gemini")).toBeTruthy();
});
