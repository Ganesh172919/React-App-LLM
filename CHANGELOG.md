# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive production documentation suite following Diátaxis framework:
  - Six Architectural Decision Records (MADR format) under `docs/records/decisions/` (ADR 0000 - 0005).
  - STRIDE System Threat Model (`docs/records/threat-models/system.md`) and OWASP Top 10 for LLM Applications 2025 (`docs/records/threat-models/ai.md`).
  - Multi-Provider System Card (`docs/records/model-cards/system-card.md`) covering clinical safety and model architecture.
  - Operational Incident Runbooks (`docs/runbooks/`) for API 5xx spikes, database connection saturation, LLM provider outage/rate limits, and DDI screener alerts.
  - Coding Agent Guidelines (`AGENTS.md`) and Machine-Readable Documentation Index (`llms.txt`).
  - Automated documentation preservation, configuration coverage, and link freshness guards (`scripts/docs/`).
  - Standard Diátaxis templates (`docs/templates/`) for ADRs, runbooks, postmortems, system cards, and evaluation plans.

## [1.0.0] - 2026-11-08

### Added
- Complete clinical safety overhaul across all 22 clinical calculator tools in `ClinicalCalculatorsModal.jsx`:
  - Mandatory unassessed initial state (`""`) across all inputs; no zero defaults.
  - Complete record gating requiring 100% component completion before score calculation.
  - Explicit "Untestable / Not Assessed (Score 0 with Documentation)" option for physical assessment scales.
  - Pure educational point tiers and qualitative risk stratifications (removed raw individual survival/mortality percentages).
  - Explicit historical 2016 MELD-Na labeling with reference links to OPTN MELD 3.0 liver allocation policy.
- Expanded deterministic Drug-Drug Interaction (DDI) safety screener to 23 FDA Boxed Warning and Contraindication rules (`backend/services/interactionService.js`), culminating in Warfarin + Amiodarone (CYP2C9/CYP3A4 inhibition).
- Web Locks API token renewal mutex in `frontend/src/lib/api.js` to serialize concurrent refresh token requests across browser tabs.
- Two-phase chat generation (`POST /api/ai/chat`) and persistence handshake (`POST /api/chat/save`) with UUID `exchangeId` idempotency.
- Multi-tier automated verification suite (`verify_project.cjs`) validating 228 automated checks across backend, frontend, Python research, and browser environments.

### Security
- Hardware-grade AES-256-GCM authenticated encryption for personal AI provider API keys with rotation ring support.
- SHA-256 hashed rotating refresh tokens with single-use replay detection.
- PII and sensitive health identifier scrubbing prior to dispatching prompts to third-party model providers.
