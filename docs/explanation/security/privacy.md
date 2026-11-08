---
title: "Data Privacy, PHI Scrubbing, and Compliance Architecture"
description: "Privacy engineering analysis of patient information handling, regex de-identification, and zero-retention provider contracts in MedAssist AI."
quadrant: explanation
audience: [security, auditor]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/services/privacyService.js", "backend/services/providerCredentials.js", "backend/models/"]
---

# Data Privacy, PHI Scrubbing, and Compliance Architecture

Handling clinical inquiries requires rigorous privacy engineering to protect Protected Health Information (PHI) and Personal Data under regulations such as HIPAA, GDPR, and DPDP.

> [!NOTE]
> This document describes technical system architecture and privacy engineering controls. It does not constitute formal legal counsel.

---

## 1. PHI De-Identification & Scrubbing Pipeline

When users submit questions containing medical narrative text, `backend/services/privacyService.js` intercepts the text prior to external AI transmission:

```javascript
// backend/services/privacyService.js
function scrubSensitiveIdentifiers(text) {
  let cleaned = text;
  // Redact Social Security Numbers
  cleaned = cleaned.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_SSN]");
  // Redact Email Addresses
  cleaned = cleaned.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]");
  // Redact Phone Numbers
  cleaned = cleaned.replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]");
  // Redact Medical Record Numbers (MRN format)
  cleaned = cleaned.replace(/\bMRN\s*#?\s*\d{6,10}\b/gi, "[REDACTED_MRN]");
  return cleaned;
}
```

This scrubbing layer aligns with the HIPAA Privacy Rule Safe Harbor standard by stripping key direct identifiers before sending prompts outside the trusted application network boundary.

---

## 2. External Provider Data Flows & Zero-Retention

When invoking Google Gemini, Groq, or Together AI:
- **Commercial API Terms:** The application interacts with enterprise/paid API endpoints where provider terms explicitly state that customer prompts and responses are **not** used to train foundation models.
- **Payload Minimization:** Only the scrubbed user message and relevant retrieved PubMed scientific literature abstracts are transmitted. Internal user IDs, session tokens, and passwords are never included in AI payloads.
- **Self-Hosted Inference Alternative:** For enterprise deployments subject to strict on-premises data isolation mandates, the system supports redirecting all inference traffic to an air-gapped local endpoint (`LOCAL_AI_BASE_URL`, such as vLLM or Ollama) with zero external internet transmission.

---

## 3. Cryptographic Storage of BYOK Credentials

Users who provide their own API keys for Groq, Together AI, or Gemini have their keys secured via `backend/services/providerCredentials.js`:
- **Algorithm:** Authenticated AES-256-GCM (Galois/Counter Mode).
- **Initialization Vector:** A unique 12-byte (96-bit) cryptographically secure random IV (`crypto.randomBytes(12)`) is generated for every credential insertion or update.
- **Authentication Tag:** A 16-byte (128-bit) GCM authentication tag is stored alongside the ciphertext, preventing ciphertext tampering or bit-flipping attacks.
- **Master Key:** The master 256-bit encryption key (`USER_API_KEY_ENCRYPTION_KEY`) is stored strictly in server environment memory and is never committed to source code or database records.

---

## 4. Database Persistence & Minimal Data Retention

Data persisted in MongoDB:
- **`User` Collection:** Stores email, bcrypt password hash (salt rounds 10), and SHA-256 hashed refresh tokens.
- **`Chat` Collection:** Stores chat conversation threads owned by the user. Users retain the ability to edit titles or permanently delete individual chat histories via `DELETE /api/history/:id`.
- **`Generation` Collection:** Tracks two-phase generation handshakes for idempotency with automatic BSON size enforcement (< 12MB).

---

**Evidence:** `backend/services/privacyService.js`, `backend/services/providerCredentials.js`, `backend/models/userModel.js`, `backend/models/chatModel.js`.
