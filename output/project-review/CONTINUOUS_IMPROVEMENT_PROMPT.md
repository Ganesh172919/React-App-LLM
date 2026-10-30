# MedAssist AI — reusable improvement prompt

Copy the text below for each improvement run. The prompt contains 200 whitespace-separated words.

Continue improving MedAssist AI through Analyze → Plan → Implement → Test → Visually inspect → Fix → Reverify.

Read current code, git changes, deployment configuration, documentation, IMPROVEMENT_PLAN.md, and prior QA evidence. Reproduce the highest-impact unresolved issue and complete one focused improvement per cycle.

Cover React/Vite/Tailwind, Express/MongoDB, authentication/OAuth, rotating sessions, CORS/authorization, encrypted keys, Gemini/Groq/Together/local providers, PubMed retrieval, citations, two-phase generation/save retries, WebSockets, history, exports, analytics, calculators, drug-interaction warnings, accessibility, and responsive light/dark layouts.

Preserve working features, API contracts, user changes, secrets, and data. Avoid unrelated rewrites, destructive operations, fabricated functionality, and weakened safety or tests. Keep dataset/LoRA tools separate from runtime; preserve quarantine, reproducible splits, and training gates.

Run relevant regression tests, then `node scripts/verify_project.cjs`. Build and launch the isolated fixture stack using `node scripts/run_build_qa.cjs --fixtures`; run `node scripts/browser_smoke.cjs` and `node scripts/check_build_serving.cjs`. Inspect actual screenshots, console/network errors, keyboard behavior, 320px/390px/desktop layouts, and loading/error states. Fix regressions and recheck affected workflows.

Distinguish fixtures from live integrations and citation checks from clinical accuracy. Update the backlog with files changed, commands, outcomes, visual evidence, blockers, and next priorities. Reuse existing evidence, but never claim unperformed verification. Continue while justified improvements remain; finish at a documented checkpoint when blocked or the cycle is complete.
