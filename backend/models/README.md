# MedAssist AI — Database Architecture & Mongoose Schema Reference

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Executive Schema Overview & Entity-Relationship Topology

MedAssist AI utilizes MongoDB 7.0 with Mongoose for structured schema enforcement, tenant isolation, and cryptographic credential storage. The persistence tier is strictly isolated behind the application boundary; clients possess zero direct database access.

```
========================================================================================================================
                                MEDASSIST AI — MONGOOSE SCHEMA & ER TOPOLOGY
========================================================================================================================

    ┌────────────────────────────────────────────────────────┐
    │                       USER MODEL                       │
    │  - _id: ObjectId (Primary Key)                         │
    │  - email: String (Unique, Indexed, Lowercase)          │
    │  - passwordHash: String (Bcrypt salted, 12 rounds)     │
    │  - sessionVersion: Number (Monotonic counter)          │
    │  - refreshTokens: [ { tokenHash, expiresAt } ]         │
    │  - isVerified: Boolean                                 │
    │  - verificationTokenHash: String (Single-use)          │
    │  - resetPasswordTokenHash: String (Single-use)         │
    │  - createdAt, updatedAt: Timestamps                    │
    └────────────────────────────────────────────────────────┘
                 │                                │
                 │ 1:N (Owner Isolation)          │ 1:N (Owner Isolation)
                 ▼                                ▼
    ┌────────────────────────────────────────┐  ┌────────────────────────────────────────────────────────┐
    │               CHAT MODEL               │  │               PROVIDER CREDENTIAL MODEL                │
    │  - _id: ObjectId (Primary Key)         │  │  - _id: ObjectId (Primary Key)                         │
    │  - owner: ObjectId (Ref: User, Indexed)│  │  - owner: ObjectId (Ref: User, Indexed)               │
    │  - title: String (Trimmed, Max 100)    │  │  - provider: Enum [gemini, groq, together] (Indexed)   │
    │  - messages: [                         │  │  - encryptedKey: {                                     │
    │      {                                 │  │      iv: String (Hex 12 bytes),                        │
    │        role: "user" | "assistant",     │  │      authTag: String (Hex 16 bytes),                   │
    │        text: String (Max 20,000 chars),│  │      ciphertext: String (Hex)                          │
    │        citations: [ SourceRefs ],      │  │    }                                                   │
    │        verification: Object,           │  │  - createdAt, updatedAt: Timestamps                    │
    │        drugInteractions: [ Warnings ], │  │  - UNIQUE COMPOUND INDEX: { owner: 1, provider: 1 }    │
    │        createdAt: ISODate              │  └────────────────────────────────────────────────────────┘
    │      }                                 │
    │    ]                                   │
    │  - createdAt, updatedAt: Timestamps    │
    └────────────────────────────────────────┘
                 │
                 │ Ephemeral 24h Buffer (Two-Phase Handshake)
                 ▼
    ┌────────────────────────────────────────────────────────┐
    │                    GENERATION MODEL                    │
    │  - _id: ObjectId (Primary Key)                         │
    │  - owner: ObjectId (Ref: User, Indexed)                │
    │  - prompt: String                                      │
    │  - response: Object (Text, Citations, DDI Warnings)   │
    │  - status: "pending" | "completed" | "failed"          │
    │  - createdAt: Date (AUTOMATED TTL: expires: 86400s)    │
    └────────────────────────────────────────────────────────┘
========================================================================================================================
```

---

## 2. Persistence Architecture Mindmap

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((Database Schemas))
    ::icon(fa fa-database)
    (01 User Schema)
      Bcrypt Password Hash (12 rounds)
      Monotonic sessionVersion
      Single-Device Invalidation
      Hashed Rotating Refresh Tokens
      Brevo Verification Tokens
    (02 Chat Schema)
      Strict Owner Isolation
      Embedded Message Array
      Deterministic Citation Arrays [N]
      Drug Interaction Banners
      Timestamp Audit Trail
    (03 Generation Schema)
      Two-Phase Ephemeral Buffer
      Automatic 24-Hour TTL Expiry
      Client Save Idempotency
      Prevents Partial Generation Loss
    (04 Provider Credential Schema)
      AES-256-GCM Envelope
      IV (12 bytes) + AuthTag (16 bytes)
      Unique Compound (owner + provider)
      Never Returned in Cleartext
```

---

## 3. Schema Specifications & Security Invariants

### 3.1 User Schema (`backend/models/userModel.js`)
- **Monotonic `sessionVersion`**: Every successful login or password reset increments `sessionVersion` by 1, instantly invalidating access tokens across any other devices.
- **Hashed Refresh Tokens**: Refresh tokens stored as SHA-256 digests. If a consumed token is replayed, the entire `refreshTokens` array for that user is immediately wiped (theft detection).
- **Index Definitions**:
  - `email`: `{ unique: true, sparse: true, collation: { locale: "en", strength: 2 } }`

### 3.2 Chat Schema (`backend/models/chatModel.js`)
- **Owner-Scoped Multi-Tenancy**: All queries (`find`, `findById`, `updateOne`, `deleteOne`) enforce `{ _id: chatId, owner: req.user._id }`.
- **Character Limits**: Maximum prompt and response text capped at $20,000$ characters.
- **Index Definitions**:
  - `{ owner: 1, updatedAt: -1 }`: Optimizes chronological sidebar conversation listing.

### 3.3 Generation Schema (`backend/models/generationModel.js`)
- **Authoritative Two-Phase Persistence**: Generated answers are saved to `generations` first with status `completed`. The user explicitly confirms persistence via `/api/save`, which moves the exchange to `chats`.
- **TTL Index**: `createdAt: { type: Date, default: Date.now, expires: 86400 }` (Automatically purged by MongoDB after 24 hours if unconfirmed).

### 3.4 Provider Credential Schema (`backend/models/providerCredentialModel.js`)
- **AES-256-GCM Vault**: Encrypted using a 256-bit server key (`USER_API_KEY_ENCRYPTION_KEY`). Authenticated encryption guarantees that any tampering with ciphertext or auth tags causes decryption failure.
- **Index Definitions**:
  - `{ owner: 1, provider: 1 }`: Unique compound index ensuring one key per provider per user.

---

## 4. Developer Extensibility: Adding a New Mongoose Model

Follow this blueprint when adding a new persistent collection (e.g., `PatientProfile`):

```javascript
// backend/models/patientProfileModel.js
import mongoose from "mongoose";

const PatientProfileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    age: {
      type: Number,
      min: 0,
      max: 120,
      required: true
    },
    biologicalSex: {
      type: String,
      enum: ["male", "female", "unspecified"],
      default: "unspecified"
    },
    knownAllergies: [
      {
        type: String,
        trim: true,
        maxlength: 100
      }
    ],
    currentMedications: [
      {
        type: String,
        trim: true,
        maxlength: 100
      }
    ]
  },
  { timestamps: true }
);

// Compound index for owner lookup
PatientProfileSchema.index({ owner: 1, createdAt: -1 });

export const PatientProfile = mongoose.model("PatientProfile", PatientProfileSchema);
```

---

## 5. Automated Verification Commands

All models and database persistence invariants are verified by the backend test runner with in-memory MongoDB:

```powershell
# Run the complete backend test suite (71 tests passing)
npm test --prefix backend

# Verify model persistence and owner tenancy
node --test backend/test/application.test.js
```
