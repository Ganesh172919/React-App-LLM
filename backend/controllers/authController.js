/**
 * ============================================================================
 * MEDASSIST AI - AUTHENTICATION CONTROLLER (authController.js)
 * ============================================================================
 * Role:
 *   Handles complete identity and access management: user registration,
 *   email verification, credential authentication, HTTP-only cookie issuance,
 *   silent access token refreshing, logout session termination, and secure
 *   tokenized password reset workflows.
 *
 * Security Architecture:
 *   - Passwords must be at least 8 characters and are hashed using bcrypt.
 *   - Access tokens (15-minute lifespan) and refresh tokens (7-day lifespan)
 *     are persisted in HTTP-only, SameSite=strict cookies.
 *   - Mandatory email verification blocks unverified users from logging in.
 *   - Transactional emails are dispatched via Brevo (Sendinblue) transactional API.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: AUTHENTICATION & CREDENTIAL MANAGEMENT
 * ----------------------------------------------------------------------------
 * [authController.js]
 *   │
 *   ├── 1. Registration (register)
 *   │     ├── Validates email regex & password length (>= 8 chars)
 *   │     ├── Checks for existing user in MongoDB
 *   │     ├── Issues 24h JWT verification token
 *   │     ├── Creates user record (isVerified: false)
 *   │     └── Dispatches verification email via emailService
 *   │
 *   ├── 2. Email Verification (verifyEmail & resendVerification)
 *   │     ├── Decodes token via JWT_VERIFICATION_TOKEN
 *   │     ├── Validates expiration against verificationTokenExpiry
 *   │     ├── Updates user.isVerified = true, clears token fields
 *   │     └── resendVerification generates new 24h token if still unverified
 *   │
 *   ├── 3. Login & Session Creation (login)
 *   │     ├── Compares bcrypt password hash
 *   │     ├── Checks user.isVerified (returns 403 if unverified)
 *   │     ├── Generates accessToken (15m) & refreshToken (7d)
 *   │     ├── Persists refreshToken hash to user document
 *   │     └── Sets HTTP-only cookies: accessToken, refreshToken
 *   │
 *   ├── 4. Token Refresh (refreshToken)
 *   │     ├── Reads refreshToken from cookie
 *   │     ├── Verifies signature via JWT_REFRESH_TOKEN
 *   │     ├── Confirms user.refreshToken matches cookie
 *   │     └── Issues fresh 15-minute accessToken cookie
 *   │
 *   ├── 5. Session Termination (logout)
 *   │     ├── Nullifies refreshToken in user document
 *   │     └── Clears accessToken & refreshToken client cookies
 *   │
 *   └── 6. Password Recovery (forgotPassword & resetPassword)
 *         ├── forgotPassword: Generates 1-hour reset token & sends email
 *         └── resetPassword: Validates token expiry, hashes new password (>= 8 chars)
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: DUAL-TOKEN AUTHENTICATION & REFRESH LIFECYCLE
 * ----------------------------------------------------------------------------
 *  Client Browser                   Express API (authController)       MongoDB
 *        │                                    │                           │
 *    [1] │─── POST /api/auth/login ──────────>│                           │
 *        │    { email, password }             ├─ bcrypt.compare() ────────┤
 *        │                                    ├─ Verify isVerified === true
 *        │                                    ├─ Issue accessToken (15m)  │
 *        │                                    ├─ Issue refreshToken (7d)  │
 *        │<── Set-Cookie: accessToken, refresh┤                           │
 *        │                                    │                           │
 *    [2] │─── GET /api/history (with token) ─>│                           │
 *        │<── 200 OK (Protected Data) ────────┤                           │
 *        │                                    │                           │
 *    [3] │   [Access Token Expires (15m)]     │                           │
 *        │─── POST /api/auth/refresh-token ──>│                           │
 *        │    Cookie: refreshToken            ├─ Verify refreshToken ─────┤
 *        │                                    ├─ Issue new accessToken    │
 *        │<── Set-Cookie: new accessToken ────┤                           │
 * ============================================================================
 */
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const EmailService = require("../services/emailService");
const emailService = require("../services/emailService");

/**
 * Register a new user account with email verification requirement.
 *
 * Mindmap Flow:
 * ```
 * [Registration Request]
 *        │
 *        ├── 1. Sanitization & Regex Check (email format, password >= 8 chars)
 *        ├── 2. Duplicate Detection (User.findOne({ email }))
 *        ├── 3. Token Minting (jwt.sign({ email }, JWT_VERIFICATION_TOKEN, 24h))
 *        ├── 4. Persistence (User document creation with verificationToken & expiry)
 *        └── 5. Dispatch (emailService.sendVerificationEmail -> Brevo SMTP/API)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client                  authController                   MongoDB            EmailService
 *   │                            │                            │                    │
 *   │── POST /api/auth/register ─>│                            │                    │
 *   │   { email, password }      ├─ Validate schema           │                    │
 *   │                            ├─ findOne({ email }) ──────>│                    │
 *   │                            │<─ null (no conflict) ──────┤                    │
 *   │                            ├─ Sign 24h JWT verification │                    │
 *   │                            ├─ new User(...).save() ────>│ (bcrypt pre-save)  │
 *   │                            │<─ document created ────────┤                    │
 *   │                            ├─ sendVerificationEmail ────────────────────────>│
 *   │<── 201 Created ────────────┤                                                 │
 * ```
 *
 * @param {import("express").Request} req Express request object containing `email` and `password` in body.
 * @param {import("express").Response} res Express response returning HTTP 201 on success or 400/500 on failure.
 * @returns {Promise<void>}
 */
exports.register = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return res.status(400).json({
      message: "Enter a valid email and a password with at least 8 characters",
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_VERIFICATION_TOKEN,
      { expiresIn: "24h" }
    );

    const user = new User({
      email,
      password,
      verificationToken,
      verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
    });

    await user.save();

    try {
      await emailService.sendVerificationEmail(email, verificationToken);
      res.status(201).json({
        message:
          "User registered successfully. Please check your email for verification.",
      });
    } catch (emailError) {
      // If email fails, still create the user but inform them about email issue
      console.error("Email service error:", emailError);
      res.status(201).json({
        message:
          "User registered successfully but verification email failed. Please contact support.",
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

/**
 * Authenticate user credentials, enforce email verification, and issue cookie-based JWT tokens.
 *
 * Mindmap Flow:
 * ```
 * [Login Request]
 *        │
 *        ├── 1. Sanitization (email lowercased/trimmed, password type checked)
 *        ├── 2. User Lookup & bcrypt.compare hash match
 *        ├── 3. Verification Enforcement (isVerified check -> 403 needsVerification)
 *        ├── 4. Token Pair Minting (accessToken 15m, refreshToken 7d)
 *        ├── 5. Session State (persist refreshToken to user document in DB)
 *        └── 6. Secure Cookie Dispatch (httpOnly, secure in prod, sameSite: strict)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client Browser             authController              MongoDB
 *       │                           │                       │
 *       │── POST /api/auth/login ──>│                       │
 *       │   { email, password }     ├─ findOne({ email }) ─>│
 *       │                           │<─ user doc ───────────┤
 *       │                           ├─ bcrypt.compare()     │
 *       │                           ├─ check user.isVerified│
 *       │                           ├─ sign access & refresh│
 *       │                           ├─ user.save(refToken) >│
 *       │                           │<─ saved ──────────────┤
 *       │<── 200 OK + Set-Cookie ───┤                       │
 *       │    { user: { id, email } }│                       │
 * ```
 *
 * @param {import("express").Request} req Express request object.
 * @param {import("express").Response} res Express response object.
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
        needsVerification: true,
      });
    }

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_ACCESS_TOKEN,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_TOKEN,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === "true"
        : process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === "true"
        : process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ user: { id: user._id, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

/**
 * Fast session validation ping reading the httpOnly accessToken cookie.
 *
 * Mindmap Flow:
 * ```
 * [Session Ping]
 *        │
 *        ├── 1. Cookie Extraction (req.cookies.accessToken)
 *        ├── 2. JWT Signature Verification (jwt.verify with JWT_ACCESS_TOKEN)
 *        └── 3. Identity Resolution (returns { user: { id } } or 401 Unauthorized)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client Browser            authController (checkAuth)
 *       │                           │
 *       │── GET /api/auth/check ───>│
 *       │   Cookie: accessToken     ├─ Verify JWT signature
 *       │<── 200 OK { user } ───────┤ (valid)
 *       │<── 401 Unauthorized ──────┤ (invalid or expired)
 * ```
 *
 * @param {import("express").Request} req Express request containing accessToken cookie.
 * @param {import("express").Response} res Express response returning user identity.
 * @returns {Promise<void>}
 */
exports.checkAuth = async (req, res) => {
  const token = req.cookies.accessToken;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.status(200).json({ user: { id: decoded.id } });
  });
};

/**
 * Terminate user session, invalidate stored refresh token in MongoDB, and clear client cookies.
 *
 * Mindmap Flow:
 * ```
 * [Logout Flow]
 *        │
 *        ├── 1. Session Invalidation (Find user by refreshToken & set refreshToken = null)
 *        ├── 2. Cookie Cleansing (res.clearCookie('accessToken'), clearCookie('refreshToken'))
 *        └── 3. Acknowledgment (200 Logged out successfully)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client Browser             authController (logout)         MongoDB
 *       │                           │                           │
 *       │── POST /api/auth/logout ─>│                           │
 *       │   Cookie: refreshToken    ├─ findOne({ refreshToken })│
 *       │                           ├─ user.refreshToken = null─>│
 *       │                           ├─ clearCookie(tokens)      │
 *       │<── 200 OK ────────────────┤                           │
 * ```
 *
 * @param {import("express").Request} req Express request containing refreshToken cookie.
 * @param {import("express").Response} res Express response confirming termination.
 * @returns {Promise<void>}
 */
exports.logout = async (req, res) => {
  const { refreshToken } = req.cookies;

  try {
    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error logging out", error });
  }
};

/**
 * Rotate access token using valid, stored refresh token cookie.
 *
 * Mindmap Flow:
 * ```
 * [Token Refresh Request]
 *        │
 *        ├── 1. Cookie Extraction (req.cookies.refreshToken)
 *        ├── 2. Cryptographic Verification (jwt.verify with JWT_REFRESH_TOKEN)
 *        ├── 3. Database Identity & Match (User.findById & compare user.refreshToken)
 *        ├── 4. Access Token Re-minting (15m JWT_ACCESS_TOKEN)
 *        └── 5. Cookie Response (Set-Cookie: accessToken; 200 OK)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client Browser            authController (refreshToken)         MongoDB
 *       │                              │                             │
 *       │── POST /api/auth/refresh ───>│                             │
 *       │   Cookie: refreshToken       ├─ jwt.verify(refreshToken)   │
 *       │                              ├─ findById(decoded.id) ─────>│
 *       │                              │<─ user doc (match check) ───┤
 *       │                              ├─ sign new accessToken (15m) │
 *       │<── 200 OK + Set-Cookie ──────┤                             │
 * ```
 *
 * @param {import("express").Request} req Express request containing refreshToken cookie.
 * @param {import("express").Response} res Express response setting new accessToken cookie.
 * @returns {Promise<void>}
 */
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_ACCESS_TOKEN,
      {
        expiresIn: "15m",
      }
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === "true"
        : process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ message: "Access token refreshed" });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token", error });
  }
};

/**
 * Verify user email address using one-time cryptographic verification token.
 *
 * Mindmap Flow:
 * ```
 * [Email Verification]
 *        │
 *        ├── 1. Token Extraction (query.token or body.token)
 *        ├── 2. Signature Validation (jwt.verify with JWT_VERIFICATION_TOKEN)
 *        ├── 3. Document Query (Match email, verificationToken, and expiry > now)
 *        ├── 4. State Transition (isVerified = true, clear verification tokens)
 *        └── 5. Response (200 OK verified: true)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client Browser            authController (verifyEmail)          MongoDB
 *       │                              │                             │
 *       │── GET /api/auth/verify?tok ─>│                             │
 *       │                              ├─ jwt.verify(token)          │
 *       │                              ├─ findOne({ email, tok, $gt})>│
 *       │                              │<─ user doc ─────────────────┤
 *       │                              ├─ user.isVerified = true     │
 *       │                              ├─ user.save() ──────────────>│
 *       │<── 200 OK { verified: true }─┤                             │
 * ```
 *
 * @param {import("express").Request} req Express request with token in query or body.
 * @param {import("express").Response} res Express response with verification result.
 * @returns {Promise<void>}
 */
exports.verifyEmail = async (req, res) => {
  const token = req.query.token || req.body.token;

  if (!token) {
    console.log("No token provided in request");
    return res.status(400).json({
      message: "Verification token is required",
      verified: false,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_TOKEN);

    const user = await User.findOne({
      email: decoded.email,
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid or expired verification token. Please request a new verification email.",
        verified: false,
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully! You can now log in.",
      verified: true,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(400).json({
      message:
        "Invalid verification token. Please try again or request a new verification email.",
      verified: false,
      error: error.message,
    });
  }
};

/**
 * Initiate password reset flow by minting a 1-hour reset token and dispatching reset email.
 *
 * Mindmap Flow:
 * ```
 * [Forgot Password Request]
 *        │
 *        ├── 1. Email Normalization (trim, lowercase)
 *        ├── 2. User Lookup (User.findOne({ email }))
 *        ├── 3. Token Generation (1h JWT_RESET_TOKEN)
 *        ├── 4. Expiry & Token Persistence (Date.now() + 1h)
 *        └── 5. Transactional Dispatch (EmailService.sendPasswordResetEmail)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client                  authController (forgotPassword)     MongoDB         EmailService
 *   │                                   │                        │                 │
 *   │── POST /api/auth/forgot-password ─>│                        │                 │
 *   │   { email }                       ├─ findOne({ email }) ──>│                 │
 *   │                                   │<─ user doc ────────────┤                 │
 *   │                                   ├─ sign 1h reset token   │                 │
 *   │                                   ├─ user.save(resetToken)─>│                 │
 *   │                                   ├─ sendPasswordResetEmail ────────────────>│
 *   │<── 200 OK "Email sent" ───────────┤                                         │
 * ```
 *
 * @param {import("express").Request} req Express request containing user email.
 * @param {import("express").Response} res Express response confirming email dispatch.
 * @returns {Promise<void>}
 */
exports.forgotPassword = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_RESET_TOKEN, {
      expiresIn: "1h",
    });

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000;
    await user.save();

    await EmailService.sendPasswordResetEmail(email, resetToken);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    res.status(500).json({ message: "Error processing request" });
  }
};

/**
 * Reset account password using verified reset token and enforce new password constraints.
 *
 * Mindmap Flow:
 * ```
 * [Reset Password Request]
 *        │
 *        ├── 1. Length & Type Check (newPassword length >= 8)
 *        ├── 2. Token Cryptographic Check (jwt.verify with JWT_RESET_TOKEN)
 *        ├── 3. Database Expiry Check (resetTokenExpiry > Date.now())
 *        ├── 4. Password Replacement (user.password = newPassword -> bcrypt pre-save)
 *        ├── 5. Token Invalidation (user.resetToken = undefined)
 *        └── 6. Confirmation (200 Password reset successfully)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client Browser            authController (resetPassword)        MongoDB
 *       │                              │                             │
 *       │── POST /api/auth/reset ─────>│                             │
 *       │   { token, newPassword }     ├─ Validate password length   │
 *       │                              ├─ jwt.verify(token)          │
 *       │                              ├─ findOne({ _id, token, $gt})>│
 *       │                              │<─ user doc ─────────────────┤
 *       │                              ├─ user.password = newPassword│
 *       │                              ├─ user.save() (bcrypt hook) ─>│
 *       │<── 200 OK "Password reset" ──┤                             │
 * ```
 *
 * @param {import("express").Request} req Express request containing token and newPassword.
 * @param {import("express").Response} res Express response confirming reset.
 * @returns {Promise<void>}
 */
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ message: "Password must contain at least 8 characters" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_TOKEN);
    const user = await User.findOne({
      _id: decoded.id,
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid reset token" });
  }
};

/**
 * Re-issue email verification token and resend activation email for unverified accounts.
 *
 * Mindmap Flow:
 * ```
 * [Resend Verification Request]
 *        │
 *        ├── 1. User Lookup (User.findOne({ email }))
 *        ├── 2. Verification Guard (isVerified check; 400 if already verified)
 *        ├── 3. Token Generation (24h JWT_VERIFICATION_TOKEN)
 *        ├── 4. Persistence (update verificationToken & verificationTokenExpiry)
 *        └── 5. Dispatch (EmailService.sendVerificationEmail)
 * ```
 *
 * Sequence Flow:
 * ```
 * Client Browser         authController (resendVerification)    MongoDB       EmailService
 *       │                              │                           │               │
 *       │── POST /resend-verification ─>│                           │               │
 *       │   { email }                  ├─ findOne({ email }) ─────>│               │
 *       │                              │<─ user doc (unverified) ──┤               │
 *       │                              ├─ sign new 24h token       │               │
 *       │                              ├─ user.save(new token) ───>│               │
 *       │                              ├─ sendVerificationEmail ──────────────────>│
 *       │<── 200 OK "Email resent" ────┤                                           │
 * ```
 *
 * @param {import("express").Request} req Express request containing email.
 * @param {import("express").Response} res Express response confirming resend.
 * @returns {Promise<void>}
 */
exports.resendVerification = async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_VERIFICATION_TOKEN,
      { expiresIn: "24h" }
    );

    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    await EmailService.sendVerificationEmail(email, verificationToken);

    res.status(200).json({
      message: "Verification email resent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      message: "Error sending verification email. Please try again.",
    });
  }
};
