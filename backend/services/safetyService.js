/**
 * ============================================================================
 * MEDASSIST AI - PROMPT SAFETY FILTER SERVICE (safetyService.js)
 * ============================================================================
 * Role:
 *   Acts as a deterministic, first-line safety shield evaluated before
 *   any LLM generation or external API call. Screens user queries for
 *   self-harm ideation, harmful instructions (poisons/bioweapons), medical
 *   emergencies requiring immediate physical intervention, and invalid or
 *   oversized payloads.
 *
 * Safety Categories & Actions:
 *   - "invalid": Empty or exceeds MAX_PROMPT_LENGTH (4,000 chars) -> Disallowed (HTTP 400).
 *   - "self_harm": Expressions of suicide or self-harm -> Disallowed (Safe redirection message).
 *   - "harmful_instruction": Creation of weapons or poisons -> Disallowed (Harm prevention message).
 *   - "possible_emergency": Acute symptoms (stroke, anaphylaxis, chest pain) -> Allowed, flagged
 *     so the controller prepends emergency helpline directives to the model output.
 *   - "allowed": Standard health/general queries permitted for processing.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: SAFETY SCREENING LOGIC
 * ----------------------------------------------------------------------------
 * [screenPrompt(prompt)]
 *   │
 *   ├── 1. Boundary & Length Validation
 *   │     ├── If empty/whitespace ────────────► { allowed: false, category: "invalid" }
 *   │     └── If length > 4000 characters ────► { allowed: false, category: "invalid" }
 *   │
 *   ├── 2. Self-Harm Inspection (SELF_HARM_PATTERNS)
 *   │     └── Matches suicide, kill myself ───► { allowed: false, category: "self_harm", message }
 *   │
 *   ├── 3. Harmful Instruction Inspection (HARMFUL_INSTRUCTION_PATTERNS)
 *   │     └── Matches poison, bioweapon ──────► { allowed: false, category: "harmful_instruction", message }
 *   │
 *   └── 4. Emergency Inspection (EMERGENCY_PATTERNS)
 *         ├── Matches chest pain, stroke ─────► { allowed: true, category: "possible_emergency" }
 *         └── Default allowed ────────────────► { allowed: true, category: "allowed" }
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: SAFETY DECISION TREE
 * ----------------------------------------------------------------------------
 *  [User Prompt]
 *        │
 *        ├──► Empty or Length > 4000? ──► [Disallowed: invalid] (400)
 *        │
 *        ├──► Matches Self-Harm? ───────► [Disallowed: self_harm] (Crisis Msg)
 *        │
 *        ├──► Matches Harmful Inst? ────► [Disallowed: harmful_instruction] (Refusal Msg)
 *        │
 *        ├──► Matches Emergency? ───────► [Allowed: possible_emergency] (Urgent Prefix)
 *        │
 *        └──► No Flags Matched ─────────► [Allowed: allowed] (Standard Processing)
 * ============================================================================
 */
const MAX_PROMPT_LENGTH = 4000;

const SELF_HARM_PATTERNS = [
  /\b(?:kill|hurt) myself\b/i,
  /\b(?:suicide|suicidal|self[- ]?harm)\b/i,
  /\bdon't want to (?:live|be alive)\b/i,
];

const HARMFUL_INSTRUCTION_PATTERNS = [
  /\bhow (?:can|do) i (?:poison|kill|harm) (?:someone|a person|people)\b/i,
  /\b(?:make|create|prepare) (?:a )?(?:poison|bioweapon)\b/i,
  /\blethal (?:dose|dosage)\b/i,
];

const EMERGENCY_PATTERNS = [
  /\b(?:chest pain|difficulty breathing|can't breathe|severe bleeding)\b/i,
  /\b(?:stroke|unconscious|seizure|anaphylaxis)\b/i,
];

const matchesAny = (value, patterns) => patterns.some((pattern) => pattern.test(value));

/**
 * ----------------------------------------------------------------------------
 * FUNCTION: screenPrompt
 * ----------------------------------------------------------------------------
 * Evaluates input prompt string against length boundaries, crisis self-harm patterns,
 * harmful weapon/poison creation patterns, and acute medical emergency terms.
 *
 * @param {string} prompt - Raw user input string.
 * @returns {{ allowed: boolean, category: string, message?: string }} Screening result.
 * ----------------------------------------------------------------------------
 */
const screenPrompt = (prompt) => {
  const value = typeof prompt === "string" ? prompt.trim() : "";

  if (!value) {
    return { allowed: false, category: "invalid", message: "Please enter a message." };
  }

  if (value.length > MAX_PROMPT_LENGTH) {
    return {
      allowed: false,
      category: "invalid",
      message: `Messages must be ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.`,
    };
  }

  if (matchesAny(value, SELF_HARM_PATTERNS)) {
    return {
      allowed: false,
      category: "self_harm",
      message:
        "I'm sorry you're dealing with this. Please contact local emergency services now if you may act on these thoughts, and reach out to a trusted person who can stay with you. I can't help with instructions for self-harm.",
    };
  }

  if (matchesAny(value, HARMFUL_INSTRUCTION_PATTERNS)) {
    return {
      allowed: false,
      category: "harmful_instruction",
      message:
        "I can't provide instructions that could seriously harm someone. I can help with prevention, safety, or getting appropriate medical support.",
    };
  }

  return {
    allowed: true,
    category: matchesAny(value, EMERGENCY_PATTERNS) ? "possible_emergency" : "allowed",
  };
};

module.exports = { MAX_PROMPT_LENGTH, screenPrompt };
