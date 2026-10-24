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
