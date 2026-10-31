# MedAssist AI — Quality Assurance Evidence Catalog & Artifact Reference

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Executive QA Overview & Artifact Topology

The quality assurance output directory (`output/qa/`) stores automated verification logs, JSON metric reports, and high-resolution Playwright browser screenshots generated during CI runs and local pre-release testing. These artifacts provide auditability, visual evidence of accessibility across desktop and mobile viewports, and regression tracking across all 182 automated checks.

```
========================================================================================================================
                          MEDASSIST AI — QA ARTIFACT GENERATION PIPELINE
========================================================================================================================

    [ TEST HARNESS EXECUTION: node scripts/verify_project.cjs / node scripts/browser_smoke.cjs ]
                                                │
                                                ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                TIER 1: STRUCTURED JSON VERIFICATION LOGS                                       │
    │  - automated-results.json: Aggregate code-check metrics (backend, frontend, python, build)                     │
    │  - browser-results.json: Results of 20 core browser workflows and scenarios                                   │
    │  - build-serving-results.json: 7 HTTP ingress assertions (cache headers, SPA routing, proxying)               │
    │  - frontend-results.json: Vitest JSON output covering 49 component and unit tests                             │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
    ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
    │                                TIER 2: CHROMIUM HEADLESS SCREENSHOT EVIDENCE                                   │
    │  - Mobile Viewports (320px, 390px): `chat-320.png`, `chat-mobile.png`, `register-mobile.png`                  │
    │  - Dark Theme Modals: `calculators-dark-modal.png`, `wells-dark-modal.png`, `curb65-dark-modal.png`           │
    │  - Clinical Caution Banners: `statin-clarithromycin-dark.png`, `allopurinol-imuran-dark.png`                  │
    │  - Desktop Workspaces: `chat-desktop.png`, `dashboard-desktop.png`, `home-desktop.png`                        │
    └────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
========================================================================================================================
```

---

## 2. QA Artifacts Mindmap

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((QA Evidence))
    ::icon(fa fa-clipboard-check)
    (01 Structured Metrics)
      automated-results.json
        182 Master Checks
        Duration & Timestamp
      browser-results.json
        20 Smoke Workflows
      build-serving-results.json
        7 HTTP Assertions
    (02 Visual Evidence)
      Mobile 320px & 390px
        No Horizontal Overflow
        Two-Row Header Stacking
      Dark Theme Modals
        WCAG AA Contrast
        Clinical Calculators
      Drug Interaction Banners
        Warfarin + Aspirin
        Statin + Clarithromycin
    (03 Log Audits)
      backend.log
      frontend-build.log
      dataset-tests.log
      lora-dry-run.log
```

---

## 3. Artifact Catalog & Description

| Artifact File | Category | Source Script | Description |
|:---|:---:|:---:|:---|
| `automated-results.json` | Report | `verify_project.cjs` | Master summary of 182 automated software checks across all suites. |
| `browser-results.json` | Report | `browser_smoke.cjs` | Verification logs for 20 browser end-to-end user workflows. |
| `build-serving-results.json` | Report | `check_build_serving.cjs` | HTTP response header assertions (immutable cache, CSP, SPA fallbacks). |
| `calculators-dark-modal.png` | Visual | `browser_verify_dark_and_tools.cjs` | Dark theme rendering of clinical calculators modal and tablist. |
| `wells-dark-modal.png` | Visual | `browser_verify_dark_and_tools.cjs` | Dark theme rendering of Wells PE score calculator. |
| `statin-clarithromycin-dark.png` | Visual | `browser_verify_dark_and_tools.cjs` | Drug interaction warning banner for Statin + Clarithromycin. |
| `chat-320.png` | Visual | `browser_smoke.cjs` | Mobile layout verification at ultra-narrow 320px viewport width. |
| `dashboard-desktop.png` | Visual | `browser_smoke.cjs` | Analytics dashboard with activity charts and evidence citation totals. |

---

## 4. Developer QA Execution Commands

```powershell
# Re-generate all automated test logs
node scripts/verify_project.cjs

# Re-generate browser screenshots and workflow logs
node scripts/run_build_qa.cjs --fixtures &
node scripts/browser_smoke.cjs
node scripts/browser_verify_dark_and_tools.cjs
```
