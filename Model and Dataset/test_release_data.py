import csv
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from prepare_dataset import stable_split
from verify_splits import validate_splits

class ReleaseDataTests(unittest.TestCase):
    def write(self, path, question):
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=["question", "answer"])
            writer.writeheader()
            if question:
                writer.writerow({"question": question, "answer": "A synthetic answer with enough words."})

    def test_canonical_variants_share_a_split(self):
        self.assertEqual(stable_split(" What IS asthma? "), stable_split("what is asthma"))
        self.assertEqual(stable_split("HIV-1 treatment"), stable_split("HIV 1 treatment"))

    def test_empty_release_splits_are_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)
            for name in ("train", "validation", "test"):
                self.write(path / (name + ".csv"), "")
            self.assertFalse(validate_splits(path)["passed"])

    def test_canonical_leakage_is_reported(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)
            for name, question in zip(("train", "validation", "test"), ("What is asthma?", "what is asthma", "Unrelated question")):
                self.write(path / (name + ".csv"), question)
            result = validate_splits(path)
            self.assertEqual(result["canonical_question_overlap"]["train_vs_validation"], 1)
            self.assertFalse(result["passed"])

    def test_manifest_counts_and_hashes_are_enforced(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)
            for name in ("train", "validation", "test"):
                self.write(path / (name + ".csv"), name + " question")
            manifest = {"splits": {name: 1 for name in ("train", "validation", "test")}, "split_sha256": {name: hashlib.sha256((path / (name + ".csv")).read_bytes()).hexdigest() for name in ("train", "validation", "test")}}
            (path / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            self.assertTrue(validate_splits(path)["passed"])
            self.write(path / "test.csv", "Modified question")
            self.assertFalse(validate_splits(path)["manifest_hashes_match"])
