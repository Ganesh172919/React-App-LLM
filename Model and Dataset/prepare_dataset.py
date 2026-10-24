"""Clean and deterministically split the medical Q&A CSV.

This is a data-preparation utility only. It does not download, fine-tune, or
evaluate a model, and it never overwrites the source CSV.
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


def normalize(value: str | None) -> str:
    return WHITESPACE_PATTERN.sub(" ", value or "").strip()


def stable_split(question: str) -> str:
    bucket = int(hashlib.sha256(question.casefold().encode("utf-8")).hexdigest()[:8], 16) % 100
    if bucket < 80:
        return "train"
    if bucket < 90:
        return "validation"
    return "test"


def load_and_clean(dataset_path: Path, minimum_answer_words: int) -> tuple[list[dict[str, str]], dict[str, int]]:
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
        "method": "SHA-256 question-level split: 80% train, 10% validation, 10% test",
        "minimum_answer_words": args.minimum_answer_words,
        "cleaning": cleaning,
        "splits": {name: len(values) for name, values in split_records.items()},
        "training_performed": False,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
