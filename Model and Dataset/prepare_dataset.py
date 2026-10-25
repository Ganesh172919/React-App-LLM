"""
===============================================================================
MEDASSIST AI - DETERMINISTIC DATASET PREPARATION (prepare_dataset.py)
===============================================================================
Role:
    Cleans raw medical Q&A data and partitions it into reproducible, leak-free
    train (80%), validation (10%), and test (10%) splits. Guarantees that the
    source dataset remains 100% untouched by writing all split files to a separate
    user-specified output directory. Performs no model fine-tuning or evaluation.

Cleaning Logic:
    1. Whitespace Normalization: Trims and collapses multiple spaces.
    2. Missing Field Rejection: Drops rows where question or answer is blank.
    3. Short Answer Filtering: Drops answers containing fewer than `minimum_answer_words`
       (default 5 words).
    4. Duplicate Question Resolution: When identical normalized questions appear,
       retains the entry with the longest answer text to preserve maximum context.
    5. Question-Level Cryptographic Splitting: Uses SHA-256 hash modulo 100 on the
       question text. Buckets 0-79 -> train, 80-89 -> validation, 90-99 -> test.
       Ensures that the same question can NEVER cross-contaminate multiple splits.

-------------------------------------------------------------------------------
MINDMAP FLOW: DATASET PREPARATION PIPELINE
-------------------------------------------------------------------------------
[prepare_dataset.py Execution]
  │
  ├── 1. CLI Argument Parsing (parse_args)
  │     ├── --input: Path to source CSV
  │     ├── --output-dir: Target directory (must differ from input parent)
  │     └── --minimum-answer-words: Default 5 words
  │
  ├── 2. Cleaning & Deduplication (load_and_clean)
  │     ├── Discards missing questions or answers
  │     ├── Discards answers with < minimum_answer_words
  │     └── Resolves duplicate questions: keeps longest answer
  │
  ├── 3. Deterministic Splitting (stable_split)
  │     ├── Computes: sha256(question.casefold())[:8] mod 100
  │     ├── [0..79]   ──► "train"      (80%)
  │     ├── [80..89]  ──► "validation" (10%)
  │     └── [90..99]  ──► "test"       (10%)
  │
  ├── 4. File Generation (write_split)
  │     ├── Writes output-dir/train.csv
  │     ├── Writes output-dir/validation.csv
  │     └── Writes output-dir/test.csv
  │
  └── 5. Manifest Serialization
        └── Writes output-dir/manifest.json (SHA-256, counts, split percentages)

-------------------------------------------------------------------------------
ASCII FLOW: QUESTION-LEVEL DETERMINISTIC SPLIT ASSIGNMENT
-------------------------------------------------------------------------------
  [Cleaned Q&A Record: "What is migraine?"]
                     │
                     ▼
  SHA-256("what is migraine?") ──► Hex Prefix: 0x4a9b1c2d
                     │
                     ▼
  Integer Value modulo 100 = 45
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
      [0..79]     [80..89]    [90..99]
      (Train)     (Valid)      (Test)
         │
         ▼
  Written to train.csv (No split leakage possible)
===============================================================================
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter
from pathlib import Path


DEFAULT_DATASET = Path(__file__).with_name(
    "Final data set for llm based health assitance (1).csv"
)
WHITESPACE_PATTERN = re.compile(r"\s+")
WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]+")


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize(value: str | None) -> str:
    return WHITESPACE_PATTERN.sub(" ", value or "").strip()


def stable_split(question: str) -> str:
    """Deterministically assign a normalized question to train (80%), validation (10%), or test (10%).

    MINDMAP FLOW:
    [stable_split]
      ├── Normalize question: question.casefold().encode("utf-8")
      ├── Cryptographic Hashing: sha256().hexdigest()[:8]
      ├── Integer conversion & modulo 100: bucket in [0..99]
      ├── [0..79]   ──► "train"
      ├── [80..89]  ──► "validation"
      └── [90..99]  ──► "test"

    ASCII FLOW:
    Question ──► SHA-256 ──► Hex Prefix ──► Modulo 100 ──► (Train / Validation / Test)
    """
    bucket = int(hashlib.sha256(question.casefold().encode("utf-8")).hexdigest()[:8], 16) % 100
    if bucket < 80:
        return "train"
    if bucket < 90:
        return "validation"
    return "test"


def load_and_clean(dataset_path: Path, minimum_answer_words: int) -> tuple[list[dict[str, str]], dict[str, int]]:
    """Clean the raw CSV, discard missing/short answers, and pick the longest answer per question.

    MINDMAP FLOW:
    [load_and_clean]
      ├── Iterate rows via csv.DictReader
      ├── Discard if question or answer is blank -> dropped_missing
      ├── Discard if answer words < minimum_answer_words -> dropped_short_answer
      ├── Deduplicate: if normalized question exists:
      │     └── retain answer with greater length -> duplicate_questions_resolved
      └── Sort clean records alphabetically by question
    """
    counters: Counter[str] = Counter()
    best_by_question: dict[str, dict[str, str]] = {}

    with dataset_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames:
            raise ValueError("Dataset has no header row")
        columns = {name.strip().lower(): name for name in reader.fieldnames}
        if "question" not in columns or "answer" not in columns:
            raise ValueError("Dataset must contain question and answer columns")

        for row in reader:
            counters["source_rows"] += 1
            question = normalize(row.get(columns["question"]))
            answer = normalize(row.get(columns["answer"]))
            if not question or not answer:
                counters["dropped_missing"] += 1
                continue
            if len(WORD_PATTERN.findall(answer)) < minimum_answer_words:
                counters["dropped_short_answer"] += 1
                continue

            key = question.casefold()
            current = best_by_question.get(key)
            if current:
                counters["duplicate_questions_resolved"] += 1
                if len(answer) <= len(current["answer"]):
                    continue
            best_by_question[key] = {"question": question, "answer": answer}

    records = sorted(best_by_question.values(), key=lambda item: item["question"].casefold())
    counters["clean_rows"] = len(records)
    return records, dict(counters)


def write_split(path: Path, records: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=["question", "answer"])
        writer.writeheader()
        writer.writerows(records)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--minimum-answer-words", type=int, default=5)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = args.input.resolve()
    output_dir = args.output_dir.resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Dataset not found: {source}")
    if args.minimum_answer_words < 1:
        raise ValueError("--minimum-answer-words must be at least 1")
    if output_dir == source.parent:
        raise ValueError("Choose a separate output directory so the source dataset stays untouched")

    records, cleaning = load_and_clean(source, args.minimum_answer_words)
    split_records = {"train": [], "validation": [], "test": []}
    for record in records:
        split_records[stable_split(record["question"])].append(record)

    output_dir.mkdir(parents=True, exist_ok=True)
    for split_name, values in split_records.items():
        write_split(output_dir / f"{split_name}.csv", values)

    manifest = {
        "source_file": source.name,
        "source_sha256": file_sha256(source),
        "method": "SHA-256 question-level split: 80% train, 10% validation, 10% test",
        "minimum_answer_words": args.minimum_answer_words,
        "cleaning": cleaning,
        "splits": {name: len(values) for name, values in split_records.items()},
        "split_percentages": {
            name: round((len(values) / len(records)) * 100, 2) if records else 0
            for name, values in split_records.items()
        },
        "training_performed": False,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
