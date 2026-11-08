---
title: "ADR 0006: AES-256-GCM Vault for User Provider Credentials"
description: "Architectural decision record detailing the authenticated encryption and key rotation architecture for Bring-Your-Own-Key user credentials."
quadrant: record
audience: [security, developer]
owner: "@medassist-team"
status: accepted
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["backend/services/providerCredentials.js", "backend/models/providerCredentialModel.js", "backend/test/providerCredentials.test.js"]
---

# ADR 0006: AES-256-GCM Vault for User Provider Credentials

## Context and Problem Statement

MedAssist AI supports Bring-Your-Own-Key (BYOK) provider credentials, enabling users to supply personal API keys for Google Gemini, Groq, Together AI, or local inference models. These API keys grant billable and programmatic access to third-party AI services.

Storing API keys in plain text in the database exposes credentials to database dumps, unauthorized database access, or accidental backup leaks. Hashing is unacceptable because the backend must present the raw plaintext key in outbound HTTPS authorization headers to upstream providers. We must encrypt keys at rest with strong confidentiality, integrity, and support for key rotation.

## Decision Drivers

- **Authenticated Encryption:** Must prevent ciphertext tampering, bit-flipping, and chosen-ciphertext attacks.
- **Unique Nonces (IVs):** Reusing initialization vectors with the same key breaks confidentiality in stream/counter modes.
- **Zero Plaintext Leakage:** Plaintext keys must never be logged, indexed, or rendered in UI API responses.
- **Key Rotation Support:** Must support phased re-encryption when master keys are rotated without breaking access to previously encrypted credentials.
- **Zero External KMS Dependency for Standalone Self-Hosting:** Must support standard containerized deployments without requiring AWS KMS or HashiCorp Vault.

## Considered Options

1. **Plaintext Storage:** Store keys directly in MongoDB. (Rejected: unacceptable security risk).
2. **AES-256-CBC with HMAC:** Traditional encrypt-then-MAC using two separate keys. (Rejected: more complex, higher chance of padding-oracle implementation errors).
3. **AES-256-GCM with Keyring Rotation:** Authenticated Galois/Counter Mode with 96-bit random IV, 128-bit auth tag, and versioned key ring. (Chosen).

## Decision Outcome

Chosen option: **AES-256-GCM with Versioned Key Ring (`providerCredentials.js`)**.

### Cryptographic Specification

1. **Cipher Algorithm:** `aes-256-gcm` (NIST SP 800-38D).
2. **Initialization Vector (IV):** 12 cryptographically random bytes (`crypto.randomBytes(12)`) generated uniquely for every encryption operation (`seal`).
3. **Authentication Tag:** 16-byte GCM authentication tag verifying ciphertext integrity before decryption (`openWithMetadata`).
4. **Key Ring Architecture:**
   - Active master key specified by `USER_API_KEY_ENCRYPTION_KEY_VERSION` and `USER_API_KEY_ENCRYPTION_KEY`.
   - Historical keys supported via `USER_API_KEY_ENCRYPTION_KEYS="v2:<hex>,v1:<hex>"`.
   - Records track `keyVersion`. If `encryption.version !== activeKeyVersion()`, the system flags `requiresRotation: true` to trigger automatic opportunistic re-encryption under the active key.
5. **Masking:** Only `lastFour` (the last 4 characters of the key) is persisted unencrypted for user UI identification (e.g. `••••••••••••abcd`).

### Consequences

- **Good:** Confidentiality and cryptographic integrity are guaranteed; altered ciphertexts or tags fail decryption with `KEY_UNAVAILABLE`.
- **Good:** Key rotation does not require a maintenance window or mass batch database migration.
- **Bad / Trade-off:** Server nodes must have access to the master 256-bit key in environment variables (`USER_API_KEY_ENCRYPTION_KEY`).

### Confirmation

Verified by automated integration tests in `backend/test/providerCredentials.test.js`:
- Successfully encrypts and decrypts with unique IVs.
- Tampered ciphertext or corrupted auth tag throws error without leaking plaintext.
- Key rotation correctly marks credentials needing re-encryption.

---

**Evidence:** `backend/services/providerCredentials.js`, `backend/models/providerCredentialModel.js`, `backend/test/providerCredentials.test.js`.
