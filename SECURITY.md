# Security Policy

**Project:** MedAssist AI  
**Status:** Stable  
**Audience:** Security Researchers, Maintainers, Enterprise Adopters  

---

## 1. Supported Versions

We provide security patches and dependency updates for the following versions:

| Version | Supported | Release Date | Notes |
|:---:|:---:|:---:|:---|
| `1.0.x` | Yes | 2026-11-08 | Current active release branch (`main`). |
| `< 1.0.0` | No | Pre-release | Historical development builds; unsupported. |

---

## 2. Reporting a Vulnerability

We take the security of MedAssist AI seriously. If you discover a vulnerability, please report it privately. **Do not open a public GitHub issue for an undisclosed vulnerability.**

### Preferred Reporting Channel
- **GitHub Private Vulnerability Advisories:** Navigate to the repository's **Security** tab and click **Report a vulnerability**.
- **Alternative Contact:** If GitHub Advisories are unavailable, email `security@example.com` (Subject: `[SECURITY] MedAssist AI Vulnerability Report`).  
  > [!NOTE] Needs owner confirmation: designated security email address.

### What to Include in Your Report
To help us triage and reproduce the issue rapidly, please include:
1. **Description:** Clear description of the vulnerability and its potential impact.
2. **Component:** Affected service (`frontend`, `backend`, `Model and Dataset`, `deploy/nginx`).
3. **Reproduction Steps:** Step-by-step instructions or minimal proof-of-concept (curl command, test script).
4. **Environment:** OS, Node.js version, browser, and configuration settings.
5. **Mitigation:** Any suggested fixes or temporary mitigations.

---

## 3. Response Targets

| Milestone | Target Response Time | Status |
|:---|:---:|:---:|
| **Initial Acknowledgment** | Within 24 hours | **Proposed** |
| **Triage & Severity Assessment** | Within 72 hours | **Proposed** |
| **Fix Delivery & Security Advisory** | Within 14 business days | **Proposed** |

---

## 4. Scope and AI-Specific Security Boundaries

### In Scope
- Remote code execution (RCE) or denial of service on Node.js backend.
- Flaws in AES-256-GCM encryption of personal provider keys in `backend/services/providerCredentials.js`.
- Cross-site scripting (XSS) in frontend chat rendering.
- Authentication bypass or privilege escalation (IDOR on `/api/chat/*`).
- Refresh token reuse or race condition bypass in `frontend/src/lib/api.js`.
- BSON document size exhaustion attacks on `/api/chat/save`.
- Flaws in the deterministic 23-rule FDA Black Box drug interaction screener (`interactionService.js`).

### AI-Specific Security Scope
- **Direct & Indirect Prompt Injection:** Vulnerabilities allowing user inputs to override core safety instructions, bypass emergency banners, or leak system directives.
- **Sensitive Information Disclosure:** Defects where user PII or unredacted tokens are leaked to third-party model providers.
- **Model Output Exploits:** Circumventing markdown sanitization to execute client-side scripts via LLM responses.

### Out of Scope
- Denial-of-service via massive network flooding (handled at Cloudflare / CDN edge).
- Vulnerabilities requiring physical access to an unlocked developer workstation.
- Theoretical attacks without proof of reproducibility.
- Generic LLM hallucinations that do not bypass clinical guardrails or safety filters.

---

## 5. Safe Harbor

If you conduct vulnerability research in good faith and adhere to this policy:
- We will not pursue legal action against you.
- We will work with you to understand and resolve the issue promptly.
- We will credit you in the release notes / advisory (unless you request anonymity).

---

**Evidence:** `docs/SECURITY_AND_MESSAGE_POLICY.md`, `docs/records/threat-models/system.md`, `docs/records/threat-models/ai.md`.
