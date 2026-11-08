# Style and Content Standards

**Document Status:** Stable  
**Audience:** All documentation authors and coding agents  
**Applicability:** New documentation files and additions to existing pages  

---

## 1. Principles of Style

1. **Second Person & Active Voice**: Address the engineer directly ("you"), prefer present tense ("returns", "validates"), and use active voice.
2. **Timeless Documentation**: Avoid temporal phrases such as "currently", "now", "soon", "recently", or "in the future". State concrete versions or conditions.
3. **Evidence Grounding**: Every technical claim (commands, defaults, formulas, ports, limits) must be traceable to code or a verified test execution. End new pages with an `**Evidence:**` footer.
4. **Admonitions**: Use standard GitHub alerts (`> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!TIP]`, `> [!CAUTION]`) so they render natively.
5. **Executable Code Fences**: Fenced code blocks must indicate the language (`bash`, `javascript`, `python`, `json`, `yaml`). Avoid shell prompt characters (`$`) in copy-paste command blocks.
6. **No Secrets**: Use placeholder credentials (`sk-...-REDACTED`, `example.com`, `127.0.0.1`) and never expose real API keys or PII.

---

## 2. Diátaxis Architecture

Every page in `docs/` belongs to one distinct quadrant:
- **Tutorials**: Action-oriented learning for beginners (getting started, end-to-end first query).
- **How-To Guides**: Goal-oriented steps solving one practical problem for developers or operators.
- **Reference**: Information-oriented, structured mirrors of technical reality (APIs, configuration, schemas, calculators).
- **Explanation**: Understanding-oriented discussions of architecture, design choices, trade-offs, and math.

---

**Evidence:** Google Developer Documentation Style Guide, Diátaxis framework, `docs/_meta/audit-report.md`.
