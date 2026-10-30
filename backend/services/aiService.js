/**
 * ============================================================================
 * MEDASSIST AI - GEMINI GENERATION SERVICE (aiService.js)
 * ============================================================================
 * Role:
 *   Encapsulates low-level HTTP interaction with the Google Generative Language
 *   API (Gemini). Handles prompt formatting, conversational context trimming,
 *   generation parameter tuning, API key authentication, and response parsing.
 *
 * Technical Parameters:
 *   - Endpoint: https://generativelanguage.googleapis.com/v1beta/models/:model:generateContent
 *   - Default Model: `gemini-3.8-flash` (customizable via `process.env.GEMINI_MODEL`)
 *   - Generation Config: Temperature: 0.25 (cautious, factual), Top-P: 0.9,
 *     Max Output Tokens: 900.
 *   - History Window: Up to 8 recent turns, each truncated to 2000 chars maximum.
 *   - Timeout: 20,000ms (20 seconds).
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: GEMINI API GENERATION PIPELINE
 * ----------------------------------------------------------------------------
 * [generateWithGemini({ prompt, systemInstruction, history })]
 *   │
 *   ├── 1. Configuration & Key Verification
 *   │     ├── Reads GEMINI_API_KEY from process.env
 *   │     └── Throws AI_NOT_CONFIGURED if API key is absent
 *   │
 *   ├── 2. Conversational History Transformation
 *   │     ├── Filters history items with valid text
 *   │     ├── Slices last 8 conversational turns
 *   │     ├── Normalizes roles: "assistant" -> "model", "user" -> "user"
 *   │     └── Caps each history part to 2,000 characters
 *   │
 *   ├── 3. Request Payload Assembly
 *   │     ├── Injects systemInstruction (medical / emergency guardrails)
 *   │     ├── Appends user prompt part to contents array
 *   │     └── Sets temperature: 0.25, maxOutputTokens: 900
 *   │
 *   ├── 4. HTTP Dispatch (Axios)
 *   │     ├── Sends POST with x-goog-api-key header and 20s timeout
 *   │     └── Extracts text via extractText(payload.candidates[0])
 *   │
 *   └── 5. Output Validation
 *         ├── If empty response: Throws AI_EMPTY_RESPONSE
 *         └── Returns { text, model }
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: GEMINI REQUEST DISPATCH & CANDIDATE EXTRACTION
 * ----------------------------------------------------------------------------
 *  aiService                      Google Gemini API Endpoint
 *      │                                      │
 *  [1] ├─ Verify GEMINI_API_KEY               │
 *  [2] ├─ Slice & format history (-8 items)   │
 *  [3] ├─ Attach systemInstruction            │
 *  [4] │─── POST :generateContent ───────────>│
 *      │    Headers: x-goog-api-key           │
 *      │    Body: { contents, config }        │
 *      │<── 200 OK Response Payload ──────────┤
 *      │    { candidates: [ { content } ] }   │
 *  [5] ├─ extractText(data)                   │
 *  [6] └── Return { text, model }             │
 * ============================================================================
 */
const axios = require("axios");

const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

const extractText = (payload) =>
  payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("\n")
    .trim();

const generateWithGemini = async ({ prompt, systemInstruction, history = [], signal, providerConfig }) => {
  const apiKey = providerConfig?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  const model = providerConfig?.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const contents = history
    .filter((item) => item?.text)
    .slice(-8)
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text.slice(0, 2000) }],
    }));

  contents.push({ role: "user", parts: [{ text: prompt }] });

  const response = await axios.post(
    `${GEMINI_API_ROOT}/${encodeURIComponent(model)}:generateContent`,
    {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      generationConfig: {
        temperature: 0.25,
        topP: 0.9,
        maxOutputTokens: 900,
      },
    },
    {
      timeout: 20000,
      signal,
      maxRedirects: 0,
      maxContentLength: 1024 * 1024,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    }
  );

  const text = extractText(response.data);
  if (response.data?.promptFeedback?.blockReason || response.data?.candidates?.[0]?.finishReason !== "STOP") {
    const error = new Error("The provider blocked or did not complete the answer");
    error.code = "AI_INCOMPLETE_RESPONSE";
    throw error;
  }
  if (!text) {
    const error = new Error("The AI provider returned an empty response");
    error.code = "AI_EMPTY_RESPONSE";
    throw error;
  }

  return { text, model };
};

module.exports = { generateWithGemini };
