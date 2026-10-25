"""
===============================================================================
MEDASSIST AI - DATASET TOOLS UNIT TESTS (test_dataset_tools.py)
===============================================================================
Role:
    Automated test suite validating the dataset analysis, multi-answer auditing,
    deterministic preparation, and split-leakage detection scripts. Executes via
    Python's standard library `unittest` framework without third-party packages.

Test Coverage:
    1. test_analysis_and_audit_are_descriptive:
       - Confirms row counting, missing value detection, and descriptive flags.
       - Asserts that `training_performed` is explicitly False.
    2. test_cleaning_keeps_longest_answer_per_question:
       - Confirms that duplicate question resolution retains the longer answer.
    3. test_stable_split_and_leakage_validator:
       - Confirms hash stability across invocations.
       - Confirms that `validate_splits()` reports zero question overlap.

-------------------------------------------------------------------------------
MINDMAP FLOW: TEST EXECUTION TREE
-------------------------------------------------------------------------------
[test_dataset_tools.py (unittest)]
  │
  ├── 1. test_analysis_and_audit_are_descriptive
  │     ├── Generates temp sample CSV with duplicates & blanks
  │     ├── Runs analyze_dataset() & audit_dataset()
  │     └── Asserts valid counts and training_performed == False
  │
  ├── 2. test_cleaning_keeps_longest_answer_per_question
  │     ├── Generates temp CSV with short & long answers for same question
  │     ├── Runs load_and_clean(minimum_answer_words=2)
  │     └── Asserts that output contains longest answer
  │
  └── 3. test_stable_split_and_leakage_validator
        ├── Confirms stable_split(q) is deterministic
        ├── Creates train, validation, and test temporary splits
        └── Asserts validate_splits(dir)["passed"] is True
===============================================================================
"""

from __future__ import annotations

import csv
import tempfile
import unittest
from pathlib import Path

from analyze_dataset import analyze_dataset
from audit_dataset import audit_dataset
from prepare_dataset import load_and_clean, stable_split
from verify_splits import validate_splits


class DatasetToolsTest(unittest.TestCase):
    def write_csv(self, path: Path, rows: list[dict[str, str]]) -> None:
        with path.open("w", encoding="utf-8", newline="") as output:
            writer = csv.DictWriter(output, fieldnames=["question", "answer"])
            writer.writeheader()
            writer.writerows(rows)

    def test_analysis_and_audit_are_descriptive(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "sample.csv"
            self.write_csv(
                source,
                [
                    {"question": "What is migraine?", "answer": "A neurological condition with recurring headache attacks."},
                    {"question": "What is migraine?", "answer": "It can involve headache, nausea, and sensitivity to light."},
                    {"question": "", "answer": "Missing question."},
                ],
            )
            analysis = analyze_dataset(source)
            audit = audit_dataset(source)
            self.assertEqual(analysis["rows"]["total"], 3)
            self.assertEqual(analysis["rows"]["valid_question_answer_pairs"], 2)
            self.assertEqual(audit["multiple_answer_questions"]["question_groups"], 1)
            self.assertFalse(audit["training_performed"])

    def test_cleaning_keeps_longest_answer_per_question(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "sample.csv"
            self.write_csv(
                source,
                [
                    {"question": "What is asthma?", "answer": "Short answer here."},
                    {"question": "What is asthma?", "answer": "This longer answer contains more useful descriptive words."},
                ],
            )
            rows, metrics = load_and_clean(source, minimum_answer_words=2)
            self.assertEqual(len(rows), 1)
            self.assertIn("longer answer", rows[0]["answer"])
            self.assertEqual(metrics["duplicate_questions_resolved"], 1)

    def test_stable_split_and_leakage_validator(self) -> None:
        question = "What are common migraine symptoms?"
        self.assertEqual(stable_split(question), stable_split(question))
        with tempfile.TemporaryDirectory() as directory:
            split_dir = Path(directory)
            rows = {
                "train": [{"question": "Question one", "answer": "Answer one"}],
                "validation": [{"question": "Question two", "answer": "Answer two"}],
                "test": [{"question": "Question three", "answer": "Answer three"}],
            }
            for name, values in rows.items():
                self.write_csv(split_dir / f"{name}.csv", values)
            report = validate_splits(split_dir)
            self.assertTrue(report["passed"])
            self.assertTrue(
                all(value == 0 for value in report["cross_split_question_overlap"].values())
            )


if __name__ == "__main__":
    unittest.main()
