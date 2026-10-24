"""Profile a medical question-answer CSV without training a model.

The script uses only Python's standard library so it can run in lightweight
development and CI environments. It never modifies the source dataset.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, median
from typing import Iterable


DEFAULT_DATASET = Path(__file__).with_name(
    "Final data set for llm based health assitance (1).csv"
)
WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]+")
WHITESPACE_PATTERN = re.compile(r"\s+")
STOP_WORDS = {
    "about",
    "after",
    "also",
    "among",
    "answer",
    "because",
    "before",
    "being",
    "between",
    "could",
    "disease",
    "does",
    "from",
    "have",
    "health",
    "into",
    "medical",
    "more",
    "most",
    "other",
    "people",
    "question",
    "should",
    "than",
    "that",
    "their",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "treatment",
    "what",
    "when",
    "where",
    "which",
    "with",
    "would",
    "your",
}

QUESTION_TYPES = (
    ("symptoms", re.compile(r"\b(?:symptoms?|signs?)\b", re.I)),
    ("causes", re.compile(r"\b(?:causes?|etiology|why)\b", re.I)),
    ("treatment", re.compile(r"\b(?:treat|treatment|therapy|medicine|drug)\b", re.I)),
    ("diagnosis", re.compile(r"\b(?:diagnos|tests?|screening)\b", re.I)),
    ("prevention", re.compile(r"\b(?:prevent|prevention|avoid)\b", re.I)),
    ("risk", re.compile(r"\b(?:risk|complications?|side effects?)\b", re.I)),
    ("prognosis", re.compile(r"\b(?:prognosis|outlook|recover|survival)\b", re.I)),
    ("definition", re.compile(r"^what\s+(?:is|are)\b", re.I)),
)


def normalize_text(value: str | None) -> str:
    """Return trimmed, single-spaced text while preserving source wording."""

    return WHITESPACE_PATTERN.sub(" ", value or "").strip()


def word_count(value: str) -> int:
    return len(WORD_PATTERN.findall(value))


def percentile(values: list[int], percentile_value: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile_value
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return float(ordered[lower])
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def length_summary(values: list[int]) -> dict[str, float | int]:
    if not values:
        return {"min": 0, "p25": 0, "median": 0, "mean": 0, "p75": 0, "p95": 0, "max": 0}
    return {
        "min": min(values),
        "p25": round(percentile(values, 0.25), 1),
        "median": round(median(values), 1),
        "mean": round(mean(values), 1),
        "p75": round(percentile(values, 0.75), 1),
        "p95": round(percentile(values, 0.95), 1),
        "max": max(values),
    }


def classify_question(question: str) -> str:
    for label, pattern in QUESTION_TYPES:
        if pattern.search(question):
            return label
    return "other"


def top_terms(values: Iterable[str], limit: int = 20) -> list[dict[str, int | str]]:
    counts: Counter[str] = Counter()
    for value in values:
        counts.update(
            token
            for token in (match.group(0).lower() for match in WORD_PATTERN.finditer(value))
            if len(token) > 3 and token not in STOP_WORDS
        )
    return [{"term": term, "count": count} for term, count in counts.most_common(limit)]


def find_column(fieldnames: list[str], expected: str) -> str:
    matches = {name.strip().lower(): name for name in fieldnames}
    if expected not in matches:
        raise ValueError(
            f"Dataset must include a '{expected}' column. Found: {', '.join(fieldnames)}"
        )
    return matches[expected]


def analyze_dataset(dataset_path: Path) -> dict[str, object]:
    questions: list[str] = []
    answers: list[str] = []
    pair_counts: Counter[tuple[str, str]] = Counter()
    question_counts: Counter[str] = Counter()
    question_type_counts: Counter[str] = Counter()
    missing_questions = 0
    missing_answers = 0
    total_rows = 0

    with dataset_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames:
            raise ValueError("Dataset has no header row")
        question_column = find_column(reader.fieldnames, "question")
        answer_column = find_column(reader.fieldnames, "answer")

        for row in reader:
            total_rows += 1
            question = normalize_text(row.get(question_column))
            answer = normalize_text(row.get(answer_column))
            if not question:
                missing_questions += 1
            if not answer:
                missing_answers += 1
            if not question or not answer:
                continue

            questions.append(question)
            answers.append(answer)
            normalized_question = question.casefold()
            pair_counts[(normalized_question, answer.casefold())] += 1
            question_counts[normalized_question] += 1
            question_type_counts[classify_question(question)] += 1

    valid_rows = len(questions)
    duplicate_pairs = sum(count - 1 for count in pair_counts.values() if count > 1)
    repeated_questions = sum(count - 1 for count in question_counts.values() if count > 1)
    question_words = [word_count(value) for value in questions]
    answer_words = [word_count(value) for value in answers]

    quality_flags = {
        "missing_question_rows": missing_questions,
        "missing_answer_rows": missing_answers,
        "exact_duplicate_rows_after_whitespace_normalization": duplicate_pairs,
        "repeated_question_rows": repeated_questions,
        "questions_under_4_words": sum(value < 4 for value in question_words),
        "answers_under_20_words": sum(value < 20 for value in answer_words),
        "answers_over_1000_words": sum(value > 1000 for value in answer_words),
    }

    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_file": dataset_path.name,
        "scope": "Descriptive profiling only; no model training or clinical validation performed.",
        "rows": {
            "total": total_rows,
            "valid_question_answer_pairs": valid_rows,
            "excluded_missing_value_rows": total_rows - valid_rows,
            "unique_normalized_questions": len(question_counts),
            "unique_normalized_pairs": len(pair_counts),
        },
        "quality_flags": quality_flags,
        "lengths_in_words": {
            "question": length_summary(question_words),
            "answer": length_summary(answer_words),
        },
        "question_types": dict(question_type_counts.most_common()),
        "top_question_terms": top_terms(questions),
        "recommendations": [
            "Remove rows with missing answers before retrieval, evaluation, or future training.",
            "Deduplicate normalized question-answer pairs and review repeated questions with conflicting answers.",
            "Retain source provenance and licensing metadata; the current CSV has only question and answer fields.",
            "Use deterministic, question-level splits to prevent duplicate questions leaking across evaluation sets.",
            "Treat this profiling report as data-quality evidence, not as clinical validation of any answer.",
        ],
    }


def render_markdown(report: dict[str, object]) -> str:
    rows = report["rows"]
    flags = report["quality_flags"]
    lengths = report["lengths_in_words"]
    question_types = report["question_types"]
    top_terms_data = report["top_question_terms"]
    recommendations = report["recommendations"]

    type_rows = "\n".join(
        f"| {label.replace('_', ' ').title()} | {count:,} |"
        for label, count in question_types.items()
    )
    term_rows = "\n".join(
        f"| {item['term']} | {item['count']:,} |" for item in top_terms_data[:12]
    )
    recommendation_rows = "\n".join(f"- {item}" for item in recommendations)

    return f"""# Medical Q&A dataset analysis

Generated from `{report['source_file']}`. This is descriptive profiling only. It does not train a model or validate clinical correctness.

## Dataset summary

| Metric | Value |
| --- | ---: |
| Total rows | {rows['total']:,} |
| Valid question-answer pairs | {rows['valid_question_answer_pairs']:,} |
| Rows excluded for missing values | {rows['excluded_missing_value_rows']:,} |
| Unique normalized questions | {rows['unique_normalized_questions']:,} |
| Unique normalized pairs | {rows['unique_normalized_pairs']:,} |

## Quality flags

| Check | Rows flagged |
| --- | ---: |
| Missing questions | {flags['missing_question_rows']:,} |
| Missing answers | {flags['missing_answer_rows']:,} |
| Exact duplicates after whitespace normalization | {flags['exact_duplicate_rows_after_whitespace_normalization']:,} |
| Repeated normalized questions | {flags['repeated_question_rows']:,} |
| Questions under 4 words | {flags['questions_under_4_words']:,} |
| Answers under 20 words | {flags['answers_under_20_words']:,} |
| Answers over 1,000 words | {flags['answers_over_1000_words']:,} |

## Text length in words

| Field | Min | Median | Mean | P95 | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Question | {lengths['question']['min']} | {lengths['question']['median']} | {lengths['question']['mean']} | {lengths['question']['p95']} | {lengths['question']['max']} |
| Answer | {lengths['answer']['min']} | {lengths['answer']['median']} | {lengths['answer']['mean']} | {lengths['answer']['p95']} | {lengths['answer']['max']} |

## Question types

| Type | Rows |
| --- | ---: |
{type_rows}

## Frequent question terms

| Term | Count |
| --- | ---: |
{term_rows}

## Recommendations

{recommendation_rows}
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_DATASET)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).with_name("reports"),
        help="Directory for dataset_analysis.json and dataset_analysis.md",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dataset_path = args.input.resolve()
    if not dataset_path.is_file():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    report = analyze_dataset(dataset_path)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    json_path = args.output_dir / "dataset_analysis.json"
    markdown_path = args.output_dir / "dataset_analysis.md"
    json_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    markdown_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"Analyzed {report['rows']['total']:,} rows")
    print(f"JSON report: {json_path.resolve()}")
    print(f"Markdown report: {markdown_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
