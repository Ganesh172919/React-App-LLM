/**
 * ============================================================================
 * MEDASSIST AI - JWT AUTHENTICATION MIDDLEWARE (authToken.js)
 * ============================================================================
 * Role:
 *   Protects private API endpoints by inspecting the incoming HTTP-only
 *   `accessToken` cookie, verifying cryptographic validity using the secret
 *   key (`JWT_ACCESS_TOKEN`), and populating `req.user` with the authenticated
 *   user identifier (`{ id: decoded.id }`).
 *
 * Security Characteristics:
 *   - Tokens are read from `req.cookies.accessToken` (HTTP-only cookie protection
 *     against Cross-Site Scripting (XSS) token exfiltration).
 *   - Missing token yields HTTP 401 Unauthorized.
 *   - Expired or forged token yields HTTP 403 Forbidden.
 *   - Attaches strictly `{ id: decoded.id }` to prevent pollution of request context.
 *
 * ----------------------------------------------------------------------------
 * MINDMAP FLOW: TOKEN VERIFICATION PIPELINE
 * ----------------------------------------------------------------------------
 * [Inbound Protected Request]
 *   │
 *   ├── 1. Cookie Extraction
 *   │     └── Reads req.cookies.accessToken
 *   │
 *   ├── 2. Existence Check
 *   │     ├── If Missing (!token) ──> Respond 401 { message: "Unauthorized" }
 *   │     └── If Present          ──> Proceed to JWT Cryptographic Verification
 *   │
 *   └── 3. Verification & Context Injection
 *         ├── jwt.verify(token, process.env.JWT_ACCESS_TOKEN)
 *         ├── On Verification Error (Expired/Signature Mismatch) ──> 403 { message: "Invalid token" }
 *         └── On Verification Success
 *               ├── Injects req.user = { id: decoded.id }
 *               └── Calls next() to transfer control to downstream controller
 *
 * ----------------------------------------------------------------------------
 * ASCII FLOW: MIDDLEWARE EXECUTION PATH
 * ----------------------------------------------------------------------------
 * [HTTP Request] ──► (req.cookies.accessToken?)
 *                            │
 *               ┌────────────┴────────────┐
 *               ▼                         ▼
 *            [No / Null]              [Present]
 *               │                         │
 *               ▼                         ▼
 *       401 Unauthorized          jwt.verify(secret)
 *                                         │
 *                                ┌────────┴────────┐
 *                                ▼                 ▼
 *                            [Invalid]          [Valid]
 *                                │                 │
 *                                ▼                 ▼
 *                         403 Forbidden    req.user = { id }
 *                                                  │
 *                                                  ▼
 *                                                next()
 * ============================================================================
 */
const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const token = req.cookies.accessToken;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = { id: decoded.id };
    next();
  });
};

module.exports = authenticateToken;
