// Deterministic first-line screening. This cannot replace clinical triage or a
// dedicated moderation service; every branch is enforced before provider calls.
const MAX_PROMPT_LENGTH = 4000;

const normalize = (value) => String(value || "").normalize("NFKC")
  .replace(/[\u200B-\u200D\uFEFF]/g, "")
  .replace(/[\u0000-\u001F\u007F]/g, " ")
  .replace(/\s+/g, " ").trim();
const matches = (value, patterns) => patterns.some((pattern) => pattern.test(value));

const SELF_HARM = [
  /\b(?:kill|hurt|cut|harm)\s+(?:myself|ourselves)\b/i,
  /\b(?:suicid(?:e|al)|self[ -]?harm|end my life|don't want to (?:live|be alive))\b/i,
  /\b(?:how (?:can|do) i overdose|best way to die|ways? to (?:hurt|kill) myself)\b/i,
  /\b(?:(?:i|we|my friend|my child)\s+(?:have\s+)?(?:took|taken|am taking)\s+(?:an\s+)?overdose|(?:i|we|my friend|my child)\s+took too many pills)\b/i,
];
const HARMFUL_INSTRUCTIONS = [
  /\b(?:how (?:can|do|would) (?:i|we)|give me (?:steps|instructions)|tell me how to|instructions? (?:for|to))\b.{0,100}\b(?:kill|poison|injure|attack|murder|stab|shoot|strangle|assault|torture|drug someone|make (?:a )?(?:bomb|explosive|bioweapon)|synthesize (?:a )?(?:toxin|poison))\b/i,
  /\b(?:make|create|prepare|synthesize|manufacture|weaponize)\b.{0,65}\b(?:poison|bioweapon|explosive|toxin|nerve agent)\b/i,
  /\b(?:lethal|fatal)\s+(?:dose|dosage|amount)\b/i,
];
const INJECTION = [
  /\b(?:ignore|override|disregard|bypass|forget)\b.{0,65}\b(?:previous|above|system|developer|safety|guardrail|instruction|rule|filter|policy)\b/i,
  /\b(?:reveal|print|show|dump|send|exfiltrate)\b.{0,70}\b(?:system prompt|developer message|hidden instruction|api[ -]?key|secret|environment variable|access token)\b/i,
  /\[(?:im_start|start_header_id)\]|<\|(?:im_start|system|developer)\|>/i,
];
const EMERGENCY = [
  /\b(?:chest pain|difficulty breathing|can't breathe|cannot breathe|severe bleeding|unconscious|unresponsive|anaphylaxis|seizure|stroke symptoms?|sudden paralysis|sudden facial droop|slurred speech|severe allergic reaction|coughing up blood|sudden loss of vision)\b/i,
  /\b(?:having a stroke|heart attack|collapsed|took an overdose)\b/i,
];

const crisisMessage = "I'm sorry you're dealing with this. If you may act on these thoughts or have taken an overdose, contact local emergency services now and ask a trusted person to stay with you. I can help with immediate safety and finding professional support.";
const harmMessage = "I can't provide instructions to seriously harm someone. I can help with prevention, safety, or appropriate medical support.";
const injectionMessage = "I can't follow requests to bypass safeguards or reveal private instructions or credentials. Please ask a health or general question instead.";

function screenPrompt(prompt) {
  if (typeof prompt !== "string") return { allowed: false, category: "invalid", message: "Please enter a message." };
  const value = normalize(prompt);
  if (!value) return { allowed: false, category: "invalid", message: "Please enter a message." };
  if (prompt.length > MAX_PROMPT_LENGTH || value.length > MAX_PROMPT_LENGTH) return { allowed: false, category: "invalid", message: `Messages must be ${MAX_PROMPT_LENGTH.toLocaleString()} characters or fewer.` };
  if (matches(value, SELF_HARM)) return { allowed: false, category: "self_harm", message: crisisMessage };
  if (matches(value, HARMFUL_INSTRUCTIONS)) return { allowed: false, category: "harmful_instruction", message: harmMessage };
  if (matches(value, INJECTION)) return { allowed: false, category: "prompt_injection", message: injectionMessage };
  // Definition and negated-symptom questions do not imply an active emergency.
  const educational = /^(?:what (?:is|are|causes)|how (?:is|are)|explain|research|define)\b/i.test(value) && !/\b(?:i have|i am|i'm|my child|right now|currently)\b/i.test(value);
  const symptoms = value.replace(/\b(?:no|without|don't have|do not have)\s+(?:any\s+)?(?:chest pain|difficulty breathing|severe bleeding|seizure|coughing up blood|sudden loss of vision)\b/gi, "");
  return { allowed: true, category: !educational && matches(symptoms, EMERGENCY) ? "possible_emergency" : "allowed" };
}

// Reject obviously unsafe provider output before it is shown or persisted.
// This is deliberately narrow to avoid making unsupported medical decisions.
function screenGeneratedAnswer(answer) {
  const value = normalize(answer);
  if (!value || answer.length > 20000) return { allowed: false, category: "invalid_output" };
  if (matches(value, [
    /\b(?:ignore|bypass|disable)\b.{0,55}\b(?:safety|guardrail|system instruction|filter)\b/i,
    /\b(?:here (?:is|are)|follow)\b.{0,35}\b(?:steps|instructions)\b.{0,100}\b(?:make a bomb|poison someone|kill yourself)\b/i,
    /(?:^|[.!?]\s)(?:take|start taking|increase your dose to)\s+\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml)\b/i,
    /(?:^|[.!?]\s)(?:stop taking|discontinue)\s+(?:your\s+)?(?:prescribed\s+)?(?:medication|medicine|insulin|antibiotics?)\b/i,
    /(?:^|[.!?]\s)(?:you (?:should|must|can)\s+)?(?:decrease|reduce|halve|double)\s+(?:your\s+)?(?:prescribed\s+)?dose\b/i,
    /\bi diagnose you with\b/i,
    /(?:^|[.!?]\s)you are diagnosed with\b/i,
    /\byou (?:definitely|certainly) have\s+[a-z][a-z -]{2,50}\b/i,
    /\b(?:drink|ingest|inject)\s+(?:bleach|disinfectant|hydrogen peroxide|rubbing alcohol)\b/i,
    /\b(?:ignore|disregard|do not listen to)\s+(?:your\s+)?(?:doctor|physician|clinician|nurse|provider)\b/i,
  ])) return { allowed: false, category: "unsafe_output" };
  return { allowed: true, category: "allowed" };
}

module.exports = { MAX_PROMPT_LENGTH, screenPrompt, screenGeneratedAnswer };
