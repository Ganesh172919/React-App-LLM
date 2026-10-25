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
 *   - Matches against a curated lexicon of clinical keywords (e.g. "symptom",
 *     "dosage", "treatment", "contraindication", "migraine", "asthma", "trial").
 *   - Checks for question phrasing prefixes (e.g. "what is", "how to treat").
 *   - Validates question context (question marks, interrogative question words,
 *     detailed queries with > 3 words, or contextual words like "doctor", "health").
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: MEDICAL QUERY DETECTION RULES
 * ----------------------------------------------------------------------------
 * [isMedicalQuery(text)]
 *   │
 *   ├── 1. Sanitization & Normalization
 *   │     └── Cleans text: toLowerCase(), strips non-word characters except hyphens
 *   │
 *   ├── 2. Medical Keyword & Prefix Matching (MEDICAL_REGEX)
 *   │     ├── MEDICAL_KEYWORDS: 70+ clinical terms (pubmed, therapy, side effect, etc.)
 *   │     └── MEDICAL_QUESTION_PREFIXES: "how to treat", "what are the symptoms of", etc.
 *   │
 *   ├── 3. Context & Sentence Structure Evaluation
 *   │     ├── isQuestion: ends with "?" OR starts with (what|how|why|when|where|who|can|should|is)
 *   │     ├── isDetailedQuery: token word count > 3
 *   │     └── hasMedicalContext: contains "medical", "health", "doctor", "hospital", "treatment"
 *   │
 *   └── 4. Routing Decision
 *         └── Returns: (hasMedicalTerm || hasMedicalContext) && (isQuestion || isDetailedQuery)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: QUERY ROUTING CLASSIFIER
 * ----------------------------------------------------------------------------
 *  [User Prompt] ──► Text Normalization
 *                          │
 *                          ▼
 *  ┌────────────────────────────────────────────────────────┐
 *  │ 1. Match Clinical Keyword or Question Prefix?          │
 *  │ 2. Has Interrogative Syntax or > 3 Words?              │
 *  └────────────────────────────────────────────────────────┘
 *                          │
 *                 ┌────────┴────────┐
 *                 ▼                 ▼
 *               [True]           [False]
 *                 │                 │
 *                 ▼                 ▼
 *          Route to PubMed    Route to General
 *         API (/api/medical)  AI (/api/ai/chat)
 * ============================================================================
 */
const MEDICAL_KEYWORDS = [
  "pubmed",
  "nih",
  "clinical",
  "study",
  "research",
  "trial",
  "patient",
  "diagnose",
  "prognosis",
  "therapy",
  "medication",
  "dosage",
  "side effect",
  "contraindication",
  "allergy",
  "inflammation",
  "infection",
  "bacteria",
  "virus",
  "pathology",
  "radiology",
  "surgery",
  "procedure",
  "test",
  "scan",
  "x-ray",
  "mri",
  "ct",
  "blood test",
  "biopsy",
  "treatment",
  "medicine",
  "drug",
  "pharmacy",
  "hospital",
  "pain",
  "illness",
  "condition",
  "prescription",
  "covid",
  "vaccine",
  "blood",
  "pressure",
  "heart",
  "lung",
  "cancer",
  "diabetes",
  "fever",
  "headache",
  "migraine",
  "symptom",
  "symptoms",
  "nausea",
  "dizziness",
  "rash",
  "asthma",
  "cholesterol",
  "antibiotic",
  "antibiotics",
  "pregnancy",
  "pregnant",
  "mental health",
  "anxiety",
  "depression",
  "injury",
  "swelling",
  "vomiting",
  "breathing",
  "seizure",
  "stroke",
];

const MEDICAL_QUESTION_PREFIXES = [
  "what is",
  "how to treat",
  "what are the symptoms of",
  "how is diagnosed",
  "what causes",
  "is contagious",
  "how long does last",
  "what are the treatments for",
  "what medicine for",
  "side effects of",
  "dose for",
  "interaction between",
  "clinical trial for",
  "should i take",
  "can i mix",
  "is safe",
  "risks of",
  "benefits of",
];

const MEDICAL_REGEX = new RegExp(
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
 * @returns {boolean} True if query contains clinical terms and question/detail syntax.
 *
 * MINDMAP FLOW:
 * [isMedicalQuery]
 *   ├── Input Validation: string check
 *   ├── Sanitization: toLowerCase(), strip non-word/hyphen chars
 *   ├── Term Matching: MEDICAL_REGEX.test(cleanText)
 *   ├── Syntactic Context: isQuestion OR isDetailedQuery (words > 3)
 *   ├── Semantic Context: hasMedicalContext ("doctor", "hospital", "health", etc.)
 *   └── Return: (hasMedicalTerm || hasMedicalContext) && (isQuestion || isDetailedQuery)
 * ----------------------------------------------------------------------------
 */
export const isMedicalQuery = (text) => {
  if (!text || typeof text !== "string") return false;

  const cleanText = text.toLowerCase().replace(/[^\w\s-]/g, "");

  // Check for medical terms
  const hasMedicalTerm = MEDICAL_REGEX.test(cleanText);

  // Check if it's a question or detailed query
  const isQuestion =
    text.trim().endsWith("?") ||
    /^(what|how|why|when|where|who|can|should|is|are|does)/i.test(cleanText);
  const isDetailedQuery = cleanText.split(/\s+/).length > 3;

  // Additional context checks
  const hasMedicalContext =
    cleanText.includes("medical") ||
    cleanText.includes("health") ||
    cleanText.includes("doctor") ||
    cleanText.includes("hospital") ||
    cleanText.includes("treatment");

  // Return true if it's a medical query with sufficient context
  return (
    (hasMedicalTerm || hasMedicalContext) && (isQuestion || isDetailedQuery)
  );
};
