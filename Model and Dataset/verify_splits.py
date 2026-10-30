"""
===============================================================================
MEDASSIST AI - CROSS-SPLIT LEAKAGE VALIDATOR (verify_splits.py)
===============================================================================
Role:
    Validates prepared dataset split files (train.csv, validation.csv, test.csv)
    for data integrity and cross-partition data contamination. Confirms that no
    missing values exist, no intra-split duplicate questions exist, and strictly
    zero cross-split question overlap occurs between train, validation, and test.
    Outputs a structured validation report and returns exit code 0 (pass) or 1 (fail).

Integrity Assertions:
    1. File Completeness: All 3 splits must be present on disk.
    2. Missing Field Zero-Tolerance: `missing_rows == 0` for all splits.
    3. Duplicate Question Zero-Tolerance: `duplicate_questions == 0` within any split.
    4. Cross-Split Zero Contamination:
       - train ∩ validation == 0
       - train ∩ test == 0
       - validation ∩ test == 0

-------------------------------------------------------------------------------
MINDMAP FLOW: SPLIT LEAKAGE VALIDATION PIPELINE
-------------------------------------------------------------------------------
[verify_splits.py Execution]
  │
  ├── 1. Read & Index Splits (read_split)
  │     ├── Inspects train.csv, validation.csv, test.csv
  │     ├── Verifies question and answer headers
  │     ├── Tracks unique normalized questions in Set
  │     └── Detects any intra-split duplicates or empty fields
  │
  ├── 2. Cross-Split Intersection Evaluation
  │     ├── overlap(train, validation) = |train ∩ validation|
  │     ├── overlap(train, test)       = |train ∩ test|
  │     └── overlap(validation, test)  = |validation ∩ test|
  │
  ├── 3. Pass/Fail Decision Logic
  │     └── passed = (all overlaps == 0) && (no missing) && (no duplicates)
  │
  └── 4. Report Serialization
        ├── Writes validation_report.json to input directory
        └── Exits with status 0 (passed) or 1 (failed)

-------------------------------------------------------------------------------
ASCII FLOW: LEAKAGE DETECTION & SET INTERSECTION
-------------------------------------------------------------------------------
   Train Questions Set          Validation Questions Set        Test Questions Set
   (e.g. 11,476 items)             (e.g. 1,435 items)           (e.g. 1,434 items)
          │                                │                            │
          ├────────────────────────────────┼────────────────────────────┤
          ▼                                ▼                            ▼
  [Intersection: Train ∩ Valid]    [Intersection: Train ∩ Test]  [Intersection: Valid ∩ Test]
          │                                │                            │
          ▼                                ▼                            ▼
      Count: 0                         Count: 0                     Count: 0
          │                                │                            │
          └────────────────────────────────┼────────────────────────────┘
                                           ▼
                           [PASSED: 0 Overlapping Questions]
===============================================================================
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import hashlib
from prepare_dataset import leakage_key
from collections import Counter
from pathlib import Path


WHITESPACE_PATTERN = re.compile(r"\s+")
SPLIT_NAMES = ("train", "validation", "test")


def normalize(value: str | None) -> str:
    return WHITESPACE_PATTERN.sub(" ", value or "").strip().casefold()


def read_split(path: Path) -> tuple[set[str], dict[str, int]]:
    """Read a CSV split file, collect unique questions into a Set, and count duplicates or blanks."""
    questions: set[str] = set()
    counters: Counter[str] = Counter()
    with path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames:
            raise ValueError(f"{path.name} has no header row")
        columns = {name.strip().lower(): name for name in reader.fieldnames}
        if "question" not in columns or "answer" not in columns:
            raise ValueError(f"{path.name} must contain question and answer columns")
        for row in reader:
            counters["rows"] += 1
            question = normalize(row.get(columns["question"]))
            answer = normalize(row.get(columns["answer"]))
            if not question or not answer:
                counters["missing_rows"] += 1
                continue
            if question in questions:
                counters["duplicate_questions"] += 1
            questions.add(question)
    counters["unique_questions"] = len(questions)
    return questions, dict(counters)


def validate_splits(input_dir: Path) -> dict[str, object]:
    """Validate that split files have zero missing fields, zero duplicates, and zero cross-split leakage.

    MINDMAP FLOW:
    [validate_splits]
      ├── Read train.csv, validation.csv, test.csv
      ├── Cross-Split Overlap Checks:
      │     ├── train_vs_validation = |train ∩ validation|
      │     ├── train_vs_test       = |train ∩ test|
      │     └── validation_vs_test  = |validation ∩ test|
      ├── Assertions:
      │     └── passed = all(overlaps == 0) && all(missing == 0) && all(duplicates == 0)
      └── Returns: Dictionary report with splits, overlaps, passed status

    ASCII FLOW:
    Split Sets ──► Set Intersections ──► Verify Overlaps == 0 ──► Passed: True/False
    """
    question_sets: dict[str, set[str]] = {}
    split_metrics: dict[str, dict[str, int]] = {}
    for name in SPLIT_NAMES:
        path = input_dir / f"{name}.csv"
        if not path.is_file():
            raise FileNotFoundError(f"Missing split: {path}")
        question_sets[name], split_metrics[name] = read_split(path)

    overlaps = {}
    for left_index, left in enumerate(SPLIT_NAMES):
        for right in SPLIT_NAMES[left_index + 1 :]:
            overlaps[f"{left}_vs_{right}"] = len(
                question_sets[left] & question_sets[right]
            )

    canonical_sets = {name: {leakage_key(value) for value in values} for name, values in question_sets.items()}
    near_overlaps = {f"{left}_vs_{right}": len(canonical_sets[left] & canonical_sets[right]) for index, left in enumerate(SPLIT_NAMES) for right in SPLIT_NAMES[index + 1:]}
    manifest_path = input_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    manifest_matches = all(split_metrics[name].get("rows", 0) == manifest.get("splits", {}).get(name, split_metrics[name].get("rows", 0)) for name in SPLIT_NAMES)
    hashes_match = all(hashlib.sha256((input_dir / f"{name}.csv").read_bytes()).hexdigest() == digest for name, digest in manifest.get("split_sha256", {}).items() if name in SPLIT_NAMES)
    passed = (
        all(metrics.get("rows", 0) > 0 for metrics in split_metrics.values())
        and manifest_matches and hashes_match and all(value == 0 for value in near_overlaps.values())
        and
        all(value == 0 for value in overlaps.values())
        and all(metrics.get("missing_rows", 0) == 0 for metrics in split_metrics.values())
        and all(
            metrics.get("duplicate_questions", 0) == 0
            for metrics in split_metrics.values()
        )
    )
    return {
        "input_directory": str(input_dir),
        "splits": split_metrics,
        "cross_split_question_overlap": overlaps,
        "canonical_question_overlap": near_overlaps,
        "manifest_counts_match": manifest_matches,
        "manifest_hashes_match": hashes_match,
        "passed": passed,
        "training_performed": False,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_dir = args.input_dir.resolve()
    report = validate_splits(input_dir)
    report_path = args.report or input_dir / "validation_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
