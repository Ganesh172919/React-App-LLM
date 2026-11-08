---
title: "ADR 0000: Use Markdown Architectural Decision Records (MADR)"
description: "Adopting Markdown Architectural Decision Records to track architectural decisions"
quadrant: record
owner: "@medassist-team"
status: accepted
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
---

# ADR 0000: Use Markdown Architectural Decision Records (MADR)

**Status:** Accepted  
**Date:** 2026-11-08  
**Deciders:** Core Engineering Team, Staff Architect  
**Technical Quadrant:** Record  

---

## Context

As the MedAssist medical assistant codebase scales across frontend, backend, AI orchestration, and clinical tooling, architectural decisions must be recorded to preserve design rationale, constraints, and trade-offs. Without a standardized, version-controlled decision record format:
- Architecture knowledge is lost across developer transitions.
- Future refactorings risk violating safety, security, or clinical invariants.
- Onboarding developers lack context for why specific patterns (such as Web Locks or in-memory MongoDB) were chosen over simpler or alternate approaches.

## Decision

We adopt Markdown Architectural Decision Records (MADR) stored in `docs/records/decisions/`.
Each decision follows the structure:
1. **Title and Number**: Sequential four-digit prefix (`0000-...`).
2. **Status**: Accepted, Proposed, Deprecated, or Superseded.
3. **Context**: Motivation, business and technical constraints, forces at play.
4. **Decision**: Chosen solution, implementation specifics, and architectural pattern.
5. **Consequences**: Positive improvements, trade-offs/negatives, and neutral operational impacts.
6. **Alternatives Considered**: Options evaluated and why they were not selected.
7. **Evidence**: Direct code references, test suites, and configuration files.

## Consequences

### Positive
- Architectural rationale is committed alongside source code and subject to code review.
- Every architectural decision is grounded in concrete repository evidence and test suites.
- Provides an immutable historical audit trail for clinical and security reviews.

### Negative
- Requires developer diligence to draft and maintain ADRs when introducing architectural modifications.

### Neutral
- ADR numbers are monotonic and immutable once committed.

## Alternatives Considered

- **External Wiki (Confluence / Notion)**: Rejected due to separation from code review, risk of drift, and lack of offline accessibility in CI.
- **Unstructured Architecture Notes in PR Descriptions**: Rejected because PR discussions become fragmented, difficult to search, and unlinked to file trees.

---

**Evidence:** `docs/records/decisions/`, `docs/_meta/style-guide.md`, `CONTRIBUTING.md`.
