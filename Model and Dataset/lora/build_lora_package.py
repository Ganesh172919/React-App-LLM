"""Create deterministic LoRA data files, quarantining ambiguous question groups. Never trains."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import sys
from collections import defaultdict
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from prepare_dataset import DEFAULT_DATASET, file_sha256, leakage_key, load_and_clean, stable_split, write_split
from verify_splits import validate_splits
from prepare_sft_records import convert_csv

def build(source: Path, output: Path) -> dict:
    source = source.resolve()
    output = output.resolve()
    if output == source.parent or source == output:
        raise ValueError("Choose a separate output directory.")
    variants = defaultdict(set)
    with source.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            question, answer = " ".join((row.get("question") or "").split()), " ".join((row.get("answer") or "").split())
            if question and answer:
                variants[leakage_key(question)].add(answer.casefold())
    ambiguous = {key for key, values in variants.items() if len(values) > 1}
    records, cleaning = load_and_clean(source, 5)
    accepted = [row for row in records if leakage_key(row["question"]) not in ambiguous]
    output.mkdir(parents=True, exist_ok=True)
    splits = {name: [row for row in accepted if stable_split(row["question"]) == name] for name in ("train", "validation", "test")}
    for name, rows in splits.items():
        write_split(output / (name + ".csv"), rows)
        convert_csv(output / (name + ".csv"), output / (name + ".jsonl"))
    source_hash = file_sha256(source)
    manifest = {
        "schema_version": 1, "source_file": source.name, "source_sha256": source_hash,
        "method": "Canonical question SHA-256 groups, approximate 80/10/10",
        "cleaning": cleaning, "quarantined_question_groups": len(ambiguous),
        "splits": {name: len(rows) for name, rows in splits.items()},
        "split_sha256": {name: file_sha256(output / (name + ".csv")) for name in splits},
        "jsonl_sha256": {name: file_sha256(output / (name + ".jsonl")) for name in splits},
        "clinical_review_approved": False, "license_review_approved": False,
        "reviewer": None, "training_performed": False,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    with (output / "provenance.jsonl").open("w", encoding="utf-8") as handle:
        for row in accepted:
            handle.write(json.dumps({"record_id": hashlib.sha256(leakage_key(row["question"]).encode()).hexdigest(), "source_sha256": source_hash, "source_url": None, "license": "unverified", "review_status": "pending", "split": stable_split(row["question"])}) + "\n")
    with (output / "quarantine.jsonl").open("w", encoding="utf-8") as handle:
        for key in sorted(ambiguous):
            handle.write(json.dumps({"question_key": key, "reason": "multiple distinct answers; human review required", "variant_count": len(variants[key])}) + "\n")
    validation = validate_splits(output)
    (output / "validation_report.json").write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")
    if not validation["passed"]:
        raise ValueError("Prepared data failed split validation.")
    return manifest

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "prepared")
    args = parser.parse_args()
    print(json.dumps(build(args.source, args.output), indent=2))
