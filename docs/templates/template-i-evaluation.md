---
title: "Evaluation report: <name> <YYYY-MM-DD>"
description: "Results of evaluating <system version> on <dataset version>"
quadrant: record
audience: [auditor, developer]
owner: "@<team>"
status: reviewed
last_reviewed: YYYY-MM-DD
review_every_days: 365
---

# Evaluation report: <name>

## Subject
System version: <git sha or tag> | Models: <ids> | Prompt versions: <ids> | Index version: <id>

## Dataset
Golden set: <name, version, size, sourcing, how it was labelled, how production failures are added>

## Method
* Retrieval metrics: context precision, context recall
* Generation metrics: faithfulness, answer relevancy
* Task metrics: <list>
* LLM-as-judge model and prompt (if used): <ids>, with human spot-check of <n> samples
* Human review rubric: <link>
* Reproduce with: `<exact command>`

## Results
| Metric | Release threshold | Result | Previous | Change |
|---|---|---|---|---|

Latency (p50 / p95) and cost per request: <measured values>

## Failure analysis
<Categories of failures with examples (redacted) and the planned fix for each.>

## Red-team findings
<Prompt injection, data leakage, jailbreak, tool misuse tests and outcomes.>

## Decision
<Release or not, and the follow-up actions.>
