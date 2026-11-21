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
 *   - Default Model: `gemini-3.5-flash-lite` (customizable via `process.env.GEMINI_MODEL`)
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
 *   ├── 5. Output Validation
 *   │     ├── If empty response: Throws AI_EMPTY_RESPONSE
 *   │     └── Returns { text, model, provider }
 *   │
 *   ----------------------------------------------------------------------------
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
 *  [6] └── Return { text, model, provider }   │
 * ============================================================================
 */
// Import Axios HTTP client library for external REST API communication.
// Facilitates structured JSON requests with configurable timeouts and abort signals.
// Supplies HTTP client transport for connecting to Google Generative Language endpoints.
const axios = require("axios");
const { modelFor } = require("./providerSelection");

// Base URL root for Google Generative Language (Gemini) v1beta REST endpoints.
// Pre-configured root path used for constructing model-specific generateContent URLs.
// Targets the official Google AI API for generative language completions.
const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

// Helper function extracting synthesized textual response from Gemini candidate parts.
// Safely navigates candidate array and maps individual text parts into a single string.
// Trims surrounding whitespace and returns an empty string fallback when parts are missing.
const extractText = (payload) =>
  payload?.candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("\n")
    .trim();

// Dispatches prompt, system instructions, and history to Gemini via HTTP POST.
// Normalizes chat history roles into "model" and "user" while bounding character lengths.
// Validates finish reasons and ensures non-empty textual output before returning.
const generateWithGemini = async ({ prompt, systemInstruction, history = [], signal, providerConfig }) => {
  // Resolve API key from provider config or deployment environment variables.
  // Checks presence of valid Gemini API credentials before making network requests.
  // Throws AI_NOT_CONFIGURED error when no API key is available in either source.
  const apiKey = providerConfig?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.code = "AI_NOT_CONFIGURED";
    throw error;
  }

  // Resolve target model name and map conversational history turns into Gemini schema.
  // Filters valid conversational turns and restricts context to the last 8 messages.
  // Maps "assistant" role to "model" and truncates individual messages to 2000 characters.
  const model = providerConfig?.model || modelFor("gemini");
  const contents = history
    .filter((item) => item?.text)
    .slice(-8)
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text.slice(0, 2000) }],
    }));

  // Append the active user prompt turn to the prepared message contents array.
  // Constructs user role turn containing the un-redacted active prompt string.
  // Completes the chronological conversational structure expected by the Gemini API.
  contents.push({ role: "user", parts: [{ text: prompt }] });

  // Execute authenticated HTTP POST request to the Gemini generateContent endpoint.
  // Sets temperature to 0.25 and maxOutputTokens to 900 for grounded clinical answers.
  // Configures a 20-second timeout, cancellation signal, and x-goog-api-key header.
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

  // Extract generated text and inspect safety finish reasons or prompt blockings.
  // Ensures candidate finishReason is strictly "STOP" to prevent truncated completions.
  // Rejects empty text responses with explicit error codes for caller fallback handling.
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

  // Return the synthesized response text alongside the active model identifier.
  // Encapsulates the verified response string for downstream verifiers and citation checks.
  // Provides provider telemetry tracking the exact model version used for generation.
  return { text, model, provider: "Gemini" };
};

// Export Gemini generation function for integration into provider selection services.
// Provides standardized interface consumed by modelProvider and answerService.
// Encapsulates Google Generative Language API communication behind a clean abstraction.
module.exports = { generateWithGemini };
