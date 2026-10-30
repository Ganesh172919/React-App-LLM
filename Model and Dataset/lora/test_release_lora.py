import csv
import json
import tempfile
import unittest
from pathlib import Path
from build_lora_package import build
from train_lora import inspect_job
from prepare_dataset import stable_split
from prepare_sft_records import convert_csv

class ReleaseLoraTests(unittest.TestCase):
    def test_package_quarantines_conflicts_and_dry_run_verifies_hashes(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "source.csv"
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=["question", "answer"])
                writer.writeheader()
                # Ensure this fixture exercises all three nonempty split groups.
                found = set()
                for index in range(1000):
                    question = "Synthetic question number " + str(index)
                    split = stable_split(question)
                    if split not in found:
                        writer.writerow({"question": question, "answer": "A synthetic descriptive answer with enough words."})
                        found.add(split)
                    if len(found) == 3:
                        break
                writer.writerow({"question": "Conflicting question", "answer": "First alternative answer with enough words."})
                writer.writerow({"question": "Conflicting question", "answer": "Another distinct answer with enough words."})
            output = Path(temp) / "prepared"
            manifest = build(source, output)
            self.assertEqual(manifest["quarantined_question_groups"], 1)
            report = inspect_job(output)
            self.assertEqual(sum(report["counts"].values()), 3)
            self.assertFalse(report["training_performed"])
            self.assertFalse(report["clinical_review_approved"])
            (output / "train.jsonl").write_text("corrupted", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "hash mismatch"):
                inspect_job(output)

    def test_conversion_rejects_source_overwrite_and_invalid_limits(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "source.csv"
            source.write_text("question,answer\nExample,Sample answer\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                convert_csv(source, source)
            with self.assertRaises(ValueError):
                convert_csv(source, Path(temp) / "target.jsonl", limit=0)

    def test_invalid_source_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / "broken.csv"
            output = Path(temp) / "records.jsonl"
            source.write_text("unexpected,columns\nfirst,second\n", encoding="utf-8")
            output.write_text("existing reviewed output\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                convert_csv(source, output)
            self.assertEqual(output.read_text(encoding="utf-8"), "existing reviewed output\n")
            self.assertEqual(list(Path(temp).glob("*.tmp")), [])
