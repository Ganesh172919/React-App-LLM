# Dataset Card — Medical Q&A CSV

## Status

**Research-only / training blocked pending provenance review.** The raw CSV is included for analysis and deterministic preparation tooling; its presence does not establish ownership, source authorization, clinical accuracy, patient-consent status, de-identification, or permission to fine-tune a public or commercial model.

## Known quality signals

The checked-in analysis reports 16,412 source rows, 5 missing-answer rows, 48 exact duplicates, 2,062 repeated-question instances, and 1,437 question groups with divergent answers. The LoRA packaging workflow quarantines divergent groups and produces deterministic question-level splits, but it cannot establish clinical correctness or legal provenance.

## Required records before any training

- Source organization, acquisition date, version, license, and permitted-use terms for every source.
- Evidence that the material is appropriately de-identified and that applicable consent/data-use terms permit training.
- Clinical review protocol, reviewers, sampling method, exclusions, and approval of the exact source SHA-256 hash.
- Evaluation protocol with an independent clinician-authored holdout set, safety/red-team cases, success thresholds, and post-training review.
- A versioned model card describing intended use, non-use, limitations, hardware, base model license, metrics, and deployment controls.

The existing build manifest defaults `clinical_review_approved` and `license_review_approved` to `false`; `train_lora.py` refuses real training unless both are explicitly set on the exact prepared dataset.
