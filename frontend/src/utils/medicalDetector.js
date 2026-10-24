const MEDICAL_KEYWORDS = [
  // Existing keywords...
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

export const isMedicalQuery = (text) => {
  if (!text || typeof text !== "string") return false;

  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, "");

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
