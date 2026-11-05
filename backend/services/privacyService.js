const { fail } = require("./validation");

// This is a minimisation layer, not a claim of complete PHI detection. The
// application must still tell people not to submit identifying information.
const DATA_PROCESSING_CONSENT_VERSION = "2026-11-04";
const REDACTION_RULES = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]"],
  [/(?<!\w)(?:\+?\d{1,3}[ .-]?)?(?:\(?\d{2,4}\)?[ .-]?)?\d{3,4}[ .-]\d{3,4}(?!\w)/g, "[phone number removed]"],
  [/\b(?:ssn|social security|aadhaar|national id|patient id|medical record number|mrn)\s*(?:number|no\.?|#|:)?\s*[A-Z0-9-]{4,}\b/gi, "[identifier removed]"],
  [/\b(?:\d{3}-?\d{2}-?\d{4}|\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4})\b/g, "[identifier removed]"],
];

function redactSensitiveText(value) {
  let text = String(value || "");
  let redactionCount = 0;
  for (const [pattern, replacement] of REDACTION_RULES) {
    text = text.replace(pattern, () => { redactionCount += 1; return replacement; });
  }
  return { text, redactionCount };
}

function consentCurrent(user) {
  return Boolean(user?.dataProcessingConsentAt && user.dataProcessingConsentVersion === DATA_PROCESSING_CONSENT_VERSION);
}

function requireCurrentConsent(user) {
  if (!consentCurrent(user)) {
    throw fail("Review and accept the data-processing notice in Account before sending questions to external literature or AI providers.", 403, "PRIVACY_CONSENT_REQUIRED");
  }
}

module.exports = { DATA_PROCESSING_CONSENT_VERSION, redactSensitiveText, consentCurrent, requireCurrentConsent };
