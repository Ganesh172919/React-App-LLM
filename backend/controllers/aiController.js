/**
 * ============================================================================
 * MEDASSIST AI - GENERAL AI CHAT CONTROLLER (aiController.js)
 * ============================================================================
 * Role:
 *   Handles general health and non-grounded user questions using Google Gemini.
 *   Integrates the safety screening engine, conversation context retrieval
 *   from prior chat history, and prompt enrichment with emergency guidelines.
 *
 * Operational & Safety Architecture:
 *   - Safety Screening: Evaluates prompts via `screenPrompt()` before calling LLM.
 *     Immediately returns safety redirection responses for self-harm or harmful requests.
 *   - Emergency Prefixing: If symptoms indicate a potential emergency (e.g. chest pain,
 *     breathing trouble), prepends urgent instruction advising immediate local emergency care.
 *   - Context Retrieval: Invokes `findRelevantHistory()` to extract top relevant
 *     prior message exchanges for the authenticated user based on token overlap.
 *   - Verification Metadata: Attaches verification audit `{ status: "generated", provider: "Gemini", ... }`.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: GENERAL AI REQUEST PROCESSING
 * ----------------------------------------------------------------------------
 * [aiController.js (handleChat)]
 *   │
 *   ├── 1. Input Extraction & Safety Screening
 *   │     ├── Reads prompt from req.body
 *   │     ├── Calls screenPrompt(prompt)
 *   │     └── If safety.allowed === false:
 *   │           └── Returns 200/400 with safety redirection message & stops processing
 *   │
 *   ├── 2. Relevant History Retrieval
 *   │     ├── Calls findRelevantHistory({ userId: req.user.id, prompt })
 *   │     └── Returns token-scored recent message pairs for conversational continuity
 *   │
 *   ├── 3. System Instruction Construction
 *   │     ├── Base: GENERAL_SYSTEM_INSTRUCTION (concise, transparent, no unverified claims)
 *   │     └── If category === "possible_emergency":
 *   │           └── Prepends urgent instruction to contact emergency services
 *   │
 *   ├── 4. Gemini Generation
 *   │     ├── Calls generateWithGemini({ prompt, history, systemInstruction })
 *   │     └── Returns model output text and model name
 *   │
 *   └── 5. Response Assembly
 *         └── Returns 200 OK with:
 *               { text, safety, retrieval: { historyMessagesUsed }, verification }
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: SAFETY SCREENING, CONTEXT RETRIEVAL, AND GENERATION
 * ----------------------------------------------------------------------------
 *  [User Prompt] ──► screenPrompt()
 *                           │
 *             ┌─────────────┴─────────────┐
 *             ▼                           ▼
 *       [Disallowed]                   [Allowed]
 *       (Self-harm/Harmful)               │
 *             │                           ▼
 *             ▼                  findRelevantHistory()
 *     Safety Redirect JSON                │
 *     (No LLM call made)                  ▼
 *                                (Emergency Category?)
 *                                         │
 *                                ┌────────┴────────┐
 *                                ▼                 ▼
 *                             [Urgent]          [Normal]
 *                                │                 │
 *                                ▼                 ▼
 *                       Prepend Emergency    Standard General
 *                          Directive           Directive
 *                                │                 │
 *                                └────────┬────────┘
 *                                         │
 *                                         ▼
 *                                generateWithGemini()
 *                                         │
 *                                         ▼
 *                                Return 200 OK Response
 * ============================================================================
 */
const { generateWithGemini } = require("../services/aiService");
const { findRelevantHistory } = require("../services/historySearch");
const { screenPrompt } = require("../services/safetyService");

const GENERAL_SYSTEM_INSTRUCTION = `You are a careful health-assistance chatbot. Be concise and transparent about uncertainty. Do not claim that a statement is medically verified unless cited evidence was supplied. Do not diagnose a user or replace professional care. If symptoms may be urgent, recommend local emergency services. Never invent citations.`;

/**
 * ----------------------------------------------------------------------------
 * METHOD: handleChat
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW:
 * [handleChat Execution]
 *   ├── Input Extraction: prompt = req.body.prompt.trim()
 *   ├── Safety Screening: screenPrompt(prompt)
 *   │     └── If !allowed: return 200/400 with safety_redirect verification
 *   ├── Context Retrieval: findRelevantHistory({ userId: req.user.id, prompt })
 *   ├── Emergency Handling:
 *   │     └── If category === "possible_emergency": Prepend emergency directive
 *   ├── Generation: generateWithGemini({ prompt, history, systemInstruction })
 *   └── Return: 200 OK { text, safety, retrieval, verification }
 *
 * ASCII FLOW:
 * [POST /api/ai/chat] ──► screenPrompt()
 *                                │
 *            ┌───────────────────┴───────────────────┐
 *            ▼                                       ▼
 *      [!allowed]                                [allowed]
 *            │                                       │
 *            ▼                                       ▼
 *     Safety Redirect                     findRelevantHistory()
 *                                                    │
 *                                                    ▼
 *                                         (Emergency Category?)
 *                                                    │
 *                                        ┌───────────┴───────────┐
 *                                        ▼                       ▼
 *                                    [Urgent]                [Normal]
 *                                        │                       │
 *                                        ▼                       ▼
 *                              Prepend Emergency Dir    Standard Directive
 *                                        │                       │
 *                                        └───────────┬───────────┘
 *                                                    │
 *                                                    ▼
 *                                         generateWithGemini()
 *                                                    │
 *                                                    ▼
 *                                           200 OK Response JSON
 * ----------------------------------------------------------------------------
 */
exports.handleChat = async (req, res) => {
  const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
  const safety = screenPrompt(prompt);

  if (!safety.allowed) {
    return res.status(safety.category === "invalid" ? 400 : 200).json({
      text: safety.message,
      safety,
      verification: { status: "safety_redirect" },
    });
  }

  try {
    const history = await findRelevantHistory({ userId: req.user.id, prompt });
    const emergencyPrefix =
      safety.category === "possible_emergency"
        ? "Start by clearly advising the user to contact local emergency services now. "
        : "";
    const result = await generateWithGemini({
      prompt,
      history,
      systemInstruction: `${emergencyPrefix}${GENERAL_SYSTEM_INSTRUCTION}`,
    });

    return res.status(200).json({
      text: result.text,
      safety,
      retrieval: { historyMessagesUsed: history.length },
      verification: {
        status: "generated",
        provider: "Gemini",
        model: result.model,
        grounded: false,
        historyMessagesUsed: history.length,
        safetyCategory: safety.category,
      },
    });
  } catch (error) {
    console.error("AI service error:", error.message);
    const status = error.code === "AI_NOT_CONFIGURED" ? 503 : 502;
    return res.status(status).json({
      message:
        error.code === "AI_NOT_CONFIGURED"
          ? "AI service is not configured on the server"
          : "AI service is temporarily unavailable",
    });
  }
};
