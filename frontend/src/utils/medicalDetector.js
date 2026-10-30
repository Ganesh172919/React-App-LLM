/**
 * ============================================================================
 * MEDASSIST AI - CLIENT MEDICAL QUERY DETECTOR (medicalDetector.js)
 * ============================================================================
 * Role:
 *   Performs client-side heuristic classification of user queries to route
 *   medical questions to the PubMed literature grounding endpoint (`/api/medical`)
 *   or general conversational inquiries to the Gemini chat endpoint (`/api/ai/chat`).
 *
 * Classification Criteria:
 *   - Matches against an evidence-based lexicon of clinical conditions, anatomy,
 *     pharmacological terms, and symptoms (e.g. "migraine", "asthma", "dosage").
 *   - Matches clinical question prefixes (e.g. "how to treat", "side effects of").
 *   - Detects contextual healthcare inquiries (e.g. queries referencing "doctor",
 *     "physician", or "health") while preventing non-health false positives.
 * ============================================================================
 */
const MEDICAL_KEYWORDS = [
  "pubmed", "nih", "clinical", "diagnos\\w*", "prognosis", "therapy", "therapies",
  "medication", "medications", "dosage", "side effect", "side effects", "contraindication",
  "allergy", "allergies", "allergic", "inflammation", "infection", "infections",
  "bacteria", "virus", "viral", "pathology", "radiology", "surgery", "surgical",
  "blood test", "biopsy", "treatment", "treatments", "medicine", "medicines",
  "drug", "drugs", "pharmacy", "pharmacist", "hospital", "clinic", "pain",
  "illness", "prescription", "covid", "vaccine", "vaccines", "vaccination",
  "blood pressure", "hypertension", "hypotension", "heart", "cardiac", "lung", "pulmonary",
  "cancer", "tumor", "tumour", "diabetes", "diabetic", "insulin", "fever",
  "headache", "headaches", "migraine", "migraines", "symptom", "symptoms",
  "nausea", "dizziness", "dizzy", "rash", "asthma", "asthmatic", "cholesterol",
  "antibiotic", "antibiotics", "pregnancy", "pregnant", "mental health",
  "anxiety", "depression", "depressed", "injury", "swelling", "vomiting", "vomit",
  "breathing", "breath", "seizure", "seizures", "stroke", "kidney", "renal",
  "liver", "hepatic", "fatigue", "faint", "fainting", "syncope", "creatinine",
  "chest pain", "shortness of breath", "warfarin", "aspirin", "ibuprofen",
  "statin", "atorvastatin", "simvastatin", "metformin", "lisinopril",
  "amoxicillin", "penicillin", "paracetamol", "acetaminophen", "omeprazole",
  "interaction"
];

const MEDICAL_QUESTION_PREFIXES = [
  "how to treat",
  "what are the symptoms of",
  "how is diagnosed",
  "what are the treatments for",
  "what medicine for",
  "side effects of",
  "dose for",
  "clinical trial for",
  "interaction between",
];

const CLINICAL_REGEX = new RegExp(
  `(?:^|\\b)(${MEDICAL_KEYWORDS.join("|")})\\b|` +
    `^(?:${MEDICAL_QUESTION_PREFIXES.join("|")})`,
  "i"
);

/**
 * ----------------------------------------------------------------------------
 * FUNCTION: isMedicalQuery
 * ----------------------------------------------------------------------------
 * Analyzes query text to classify whether it requires evidence-grounded PubMed
 * literature retrieval or general conversational AI.
 *
 * @param {string} text - Raw user prompt string.
 * @returns {boolean} True if query contains clinical terms or contextual health questions.
 * ----------------------------------------------------------------------------
 */
export const isMedicalQuery = (text) => {
  if (!text || typeof text !== "string") return false;

  const cleanText = text.toLowerCase().replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanText || cleanText.length < 2) return false;

  // Direct match for explicit clinical keywords or specific medical prefixes
  if (CLINICAL_REGEX.test(cleanText)) return true;

  // Question syntax or multi-word structure with health context
  const isQuestion =
    text.trim().endsWith("?") ||
    /^(?:what|how|why|when|where|who|can|should|is|are|does)\b/i.test(cleanText);
  const isDetailedQuery = cleanText.split(/\s+/).length > 2;

  const hasMedicalContext =
    /\b(?:medical|doctor|nurse|physician|patient|prescriber)\b/i.test(cleanText) ||
    (/\bhealth\b/i.test(cleanText) && !/\b(?:financial|economic|fiscal|market)\b/i.test(cleanText));

  return Boolean(hasMedicalContext && (isQuestion || isDetailedQuery));
};
