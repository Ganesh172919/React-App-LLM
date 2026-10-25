"""Unit tests for no-training LoRA preparation utilities.

==============================================================================
LORA TOOLS UNIT TEST SUITE (test_lora_tools.py)
==============================================================================
Role:
  Guarantees invariants across the LoRA configuration parser, parameter
  estimation math, and deterministic SFT JSONL conversion.

------------------------------------------------------------------------------
TEST SUITE MINDMAP
------------------------------------------------------------------------------
[test_lora_tools.py]
       │
       ├── 1. Invariant Validation (test_repository_config_is_valid_and_training_disabled)
       │     ├── training_enabled is False
       │     └── task_type == "CAUSAL_LM"
       ├── 2. Parameter Math Check (test_parameter_estimate)
       │     ├── 12 * 1 * 2 * 768 * 8 == 147,456 parameters
       │     └── training_performed is False
       └── 3. SFT Cleaning & Exclusion (test_sft_conversion_skips_incomplete_rows)
             ├── Incomplete rows skipped
             └── Valid QA pairs serialized to JSONL

------------------------------------------------------------------------------
ASCII ASSERTION FLOW
------------------------------------------------------------------------------
  lora_config.json ──► load_lora_config() ──► assert training_enabled == False
  Math Inputs (H=768, L=12, P=1, R=8)    ──► assert params == 147456
  CSV with 1 valid & 1 incomplete row    ──► assert written == 1, skipped == 1
==============================================================================
"""

from __future__ import annotations

import csv
import json
import tempfile
import unittest
from pathlib import Path

from lora_config import load_lora_config
from prepare_sft_records import convert_csv
from validate_lora_setup import build_report, estimate_adapter_parameters


class LoraToolTests(unittest.TestCase):
    def test_repository_config_is_valid_and_training_disabled(self) -> None:
        settings, _ = load_lora_config()
        self.assertFalse(settings.training_enabled)
        self.assertEqual(settings.task_type, "CAUSAL_LM")

    def test_parameter_estimate(self) -> None:
        self.assertEqual(estimate_adapter_parameters(768, 12, 1, 8), 147456)
        report = build_report(None, 768, 12)
        self.assertFalse(report["training_performed"])

    def test_sft_conversion_skips_incomplete_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "input.csv"
            output = Path(temp_dir) / "output.jsonl"
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=["question", "answer"])
                writer.writeheader()
                writer.writerow({"question": "What is a migraine?", "answer": "A neurological condition."})
                writer.writerow({"question": "Missing", "answer": ""})
            result = convert_csv(source, output)
            records = [json.loads(line) for line in output.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(result["records_written"], 1)
            self.assertEqual(result["records_skipped"], 1)
            self.assertEqual(records[0]["question"], "What is a migraine?")


if __name__ == "__main__":
    unittest.main()
