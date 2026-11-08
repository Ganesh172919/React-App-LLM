# Support Policy

**Project:** MedAssist AI  
**Audience:** Users, Contributors, Operators  

---

## 1. Where to Get Help

- **Documentation:** Review the [Technical Documentation Suite](docs/index.md), [Agent Guide](AGENTS.md), and [Frequently Addressed Architecture Topics](docs/SYSTEM_ARCHITECTURE_DEEP_DIVE.md).
- **GitHub Issues:** Use GitHub Issues for reporting reproducible bugs or submitting feature proposals.
- **GitHub Discussions:** Use Discussions for architecture questions, community ideas, or troubleshooting local development setups.

---

## 2. Filing a Bug Report

Before opening a bug report:
1. Search existing issues to confirm it has not already been reported.
2. Verify you are running on supported runtimes: Node.js 20+ LTS, Python 3.10+, MongoDB 7.0.
3. Check the [Operational Runbooks](docs/runbooks/index.md) if the issue involves server errors, database connection issues, or LLM provider timeouts.

When opening an issue, please use the issue templates and provide:
- Exact reproduction steps.
- Expected behavior vs actual observed behavior.
- Browser/OS version and Node.js version (`node -v`).
- Relevant non-confidential logs (remember: **never share API keys or credentials**).

---

## 3. Scope of Support

### What We Support
- Setup and build failures following the [Production Build Guide](docs/PRODUCTION_DEVELOPER_BUILD_GUIDE.md).
- Bugs in the 22 clinical risk calculators or 23 FDA Black Box DDI rules.
- Test failures across the 228 automated check suite.
- Issues with Docker Compose deployment orchestration.

### What Is Out of Scope
- Direct medical diagnosis, individual clinical treatment advice, or emergency consultation.
- Custom modifications to upstream foundation models outside supported providers (Gemini, Groq, Together, local OpenAI-compatible).
- Unofficial third-party plugins or browser extensions.

---

**Evidence:** `docs/PRODUCTION_DEVELOPER_BUILD_GUIDE.md`, `README.md`, `CONTRIBUTING.md`.
