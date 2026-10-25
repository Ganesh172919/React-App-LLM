/**
 * ============================================================================
 * MEDASSIST AI - USER MONGOOSE MODEL (userModel.js)
 * ============================================================================
 * Role:
 *   Defines the MongoDB schema and lifecycle hooks for user accounts,
 *   authentication credentials, email verification states, and password
 *   reset token management.
 *
 * Security & Lifecycle Highlights:
 *   - Automatic Password Hashing: A pre-save Mongoose hook inspects whether
 *     the `password` field has been modified, automatically salting and hashing
 *     it using bcrypt with a work factor of 10 rounds.
 *   - Account Verification: Stores a signed `verificationToken` and expiration
 *     timestamp (`verificationTokenExpiry`, 24h default) alongside boolean `isVerified`.
 *   - Password Recovery: Stores temporary `resetToken` and `resetTokenExpiry` (1h).
 *   - Case-Insensitive Normalization: Enforces lowercase and trimmed email formatting.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: USER SCHEMA AND AUTH LIFECYCLE
 * ----------------------------------------------------------------------------
 * [User Schema (userModel.js)]
 *   │
 *   ├── 1. Schema Properties
 *   │     ├── email: { String, unique: true, lowercase: true, trim: true }
 *   │     ├── password: { String, required: true } (hashed via bcrypt)
 *   │     ├── isVerified: { Boolean, default: false }
 *   │     ├── verificationToken: String
 *   │     ├── verificationTokenExpiry: Date (24 hours validity)
 *   │     ├── resetToken: String
 *   │     └── resetTokenExpiry: Date (1 hour validity)
 *   │
 *   └── 2. Mongoose Pre-Save Lifecycle Hook
 *         ├── Checks this.isModified("password")
 *         ├── True  ──> bcrypt.hash(this.password, 10) ──> next()
 *         └── False ──> next()
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: PASSWORD MUTATION & PRE-SAVE ENCRYPTION
 * ----------------------------------------------------------------------------
 * [user.save() called]
 *         │
 *         ▼
 * (this.isModified("password")?)
 *         │
 *    ┌────┴──────────────────────────┐
 *    ▼                               ▼
 *  [Yes]                            [No]
 *    │                               │
 *    ▼                               │
 * bcrypt.hash(plaintext, 10)         │
 *    │                               │
 *    ▼                               │
 * Store salt + hash in this.password │
 *    │                               │
 *    └───────────────┬───────────────┘
 *                    ▼
 *                 next() ──► Persist to MongoDB
 * ============================================================================
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpiry: Date,
  resetToken: String,
  resetTokenExpiry: Date,
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
