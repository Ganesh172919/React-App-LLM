r"""
===============================================================================
MEDASSIST AI - REPEATED QUESTION & VARIANT AUDITOR (audit_dataset.py)
===============================================================================
Role:
    Audits repeated questions and divergent answer variations in the medical
    Q&A CSV. Computes pairwise Jaccard token similarity across all answer variants
    belonging to the same normalized question key. Identifies conflicting or
    divergent answers (similarity < 0.35), inspects content for embedded URLs,
    HTML markup, and non-ASCII symbols, and records the dataset's SHA-256 digest.
    Does not modify source files or execute model training.

Audit Highlights:
    - Multi-Answer Groups: Pinpoints question keys mapping to 2 or more distinct
      answers (e.g. 1,396 multi-answer groups in the dataset).
    - Divergence Detection: Flags question groups with minimum pairwise Jaccard
      similarity below 0.35 (1,128 groups in source data).
    - Content Flags: Detects HTML-like markup, web URLs (159 rows), and non-ASCII chars.
    - Checksum Verification: Computes cryptographic SHA-256 for dataset provenance.
    - Output formats: `dataset_audit.json` and `dataset_audit.md`.

-------------------------------------------------------------------------------
MINDMAP FLOW: MULTI-ANSWER AUDITING WORKFLOW
-------------------------------------------------------------------------------
[audit_dataset.py Main Execution]
  │
  ├── 1. Cryptographic Provenance (file_sha256)
  │     └── Calculates SHA-256 hash of the target CSV file
  │
  ├── 2. Row Parsing & Grouping (audit_dataset)
  │     ├── Groups unique normalized answers under each normalized question key
  │     ├── Inspects answers for HTML regex /<\s*[a-z][^>]*>/
  │     ├── Inspects answers for URL regex /https?:\/\/|www\./
  │     └── Inspects answers for non-ASCII characters (> 127)
  │
  ├── 3. Pairwise Jaccard Similarity Analysis
  │     ├── For questions with >= 2 answers:
  │     │     ├── Extracts lowercase token sets (token_set)
  │     │     ├── Evaluates Jaccard similarity: |A ∩ B| / |A ∪ B|
  │     │     ├── Finds minimum and mean similarity for the question group
  │     │     └── Flags group if minimum_similarity < 0.35
  │     └── Sorts multi-answer groups by variant count and lowest similarity
  │
  └── 4. Report Generation
        ├── Writes JSON report: reports/dataset_audit.json
        └── Writes Markdown report: reports/dataset_audit.md via render_markdown()

-------------------------------------------------------------------------------
ASCII FLOW: JACCARD SIMILARITY & VARIANT DETECTION
-------------------------------------------------------------------------------
  [Normalized Question Key: "What is high blood cholesterol?"]
                  │
        ┌─────────┴──────────────────────────┐
        ▼                                    ▼
   Answer Variant A                     Answer Variant B
  "Condition with excess               "Lipid disorder elevating
   blood lipids and risk..."            cardiovascular risk..."
        │                                    │
        ▼                                    ▼
   Token Set A:                         Token Set B:
   {"condition", "excess",              {"lipid", "disorder",
    "blood", "lipids", "risk"}           "elevating", "cardiovascular", "risk"}
        │                                    │
        └─────────────────┬──────────────────┘
                          │
                          ▼
            Compute Jaccard Similarity:
            |A ∩ B| / |A ∪ B| = 2 / 8 = 0.250 (< 0.35)
                          │
                          ▼
     [Flag as Low-Similarity Multi-Answer Group]
===============================================================================
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import defaultdict
from itertools import combinations
from pathlib import Path
from statistics import mean

from analyze_dataset import DEFAULT_DATASET, find_column, normalize_text, word_count


TOKEN_PATTERN = re.compile(r"[a-z][a-z'-]+")
HTML_PATTERN = re.compile(r"<\s*[a-z][^>]*>", re.I)
URL_PATTERN = re.compile(r"https?://|www\.", re.I)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def token_set(value: str) -> set[str]:
    return set(TOKEN_PATTERN.findall(value.casefold()))


def jaccard_similarity(left: str, right: str) -> float:
    left_tokens = token_set(left)
    right_tokens = token_set(right)
    if not left_tokens and not right_tokens:
        return 1.0
    union = left_tokens | right_tokens
    return len(left_tokens & right_tokens) / len(union) if union else 0.0


def audit_dataset(dataset_path: Path, sample_limit: int = 20) -> dict[str, object]:
    """Audit repeated questions and divergence across multiple answers.

    MINDMAP FLOW:
    [audit_dataset]
      ├── Provenance: file_sha256 calculation
      ├── Row Streaming: Group unique normalized answers per question
      ├── Content Flagging: Match HTML tags, URLs, non-ASCII characters
      ├── Pairwise Jaccard Analysis:
      │     ├── Generate 2-combinations of answers for each question group
      │     ├── Evaluate token set intersection / union
      │     └── Flag groups where minimum similarity < 0.35
      └── Returns: Dictionary payload with multiple_answer_questions, content_flags, sample_groups

    ASCII FLOW:
    CSV File ──► Group Answers by Question ──► Jaccard Pairwise Analysis ──► Flag Variants
    """
    answers_by_question: dict[str, dict[str, str]] = defaultdict(dict)
    display_questions: dict[str, str] = {}
    row_counts: dict[str, int] = defaultdict(int)
    total_rows = 0
    valid_rows = 0
    html_rows = 0
    url_rows = 0
    non_ascii_rows = 0

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
            if not question or not answer:
                continue
            valid_rows += 1
            question_key = question.casefold()
            answer_key = answer.casefold()
            display_questions.setdefault(question_key, question)
            answers_by_question[question_key].setdefault(answer_key, answer)
            row_counts[question_key] += 1
            html_rows += int(bool(HTML_PATTERN.search(answer)))
            url_rows += int(bool(URL_PATTERN.search(answer)))
            non_ascii_rows += int(any(ord(character) > 127 for character in answer))

    multi_answer_groups = []
    similarity_values = []
    low_similarity_groups = 0
    for question_key, answer_map in answers_by_question.items():
        answers = list(answer_map.values())
        if len(answers) < 2:
            continue
        pair_scores = [
            jaccard_similarity(left, right) for left, right in combinations(answers, 2)
        ]
        minimum_similarity = min(pair_scores) if pair_scores else 1.0
        average_similarity = mean(pair_scores) if pair_scores else 1.0
        similarity_values.extend(pair_scores)
        low_similarity_groups += int(minimum_similarity < 0.35)
        multi_answer_groups.append(
            {
                "question": display_questions[question_key],
                "source_rows": row_counts[question_key],
                "distinct_answers": len(answers),
                "answer_word_counts": sorted(word_count(answer) for answer in answers),
                "minimum_answer_similarity": round(minimum_similarity, 3),
                "average_answer_similarity": round(average_similarity, 3),
            }
        )

    multi_answer_groups.sort(
        key=lambda item: (
            -item["distinct_answers"],
            item["minimum_answer_similarity"],
            item["question"].casefold(),
        )
    )
    distinct_answer_count = sum(len(values) for values in answers_by_question.values())

    return {
        "source_file": dataset_path.name,
        "source_sha256": file_sha256(dataset_path),
        "scope": "Structural and duplication audit only; no clinical validation or model training performed.",
        "rows": {
            "total": total_rows,
            "valid": valid_rows,
            "distinct_normalized_answers": distinct_answer_count,
        },
        "multiple_answer_questions": {
            "question_groups": len(multi_answer_groups),
            "rows_in_groups": sum(item["source_rows"] for item in multi_answer_groups),
            "additional_answer_variants": sum(
                item["distinct_answers"] - 1 for item in multi_answer_groups
            ),
            "groups_below_0_35_similarity": low_similarity_groups,
            "mean_pairwise_similarity": round(mean(similarity_values), 3)
            if similarity_values
            else 1.0,
        },
        "content_flags": {
            "answers_with_html_like_markup": html_rows,
            "answers_with_urls": url_rows,
            "answers_with_non_ascii_characters": non_ascii_rows,
        },
        "sample_groups": multi_answer_groups[:sample_limit],
        "recommendations": [
            "Review low-similarity answer variants before retrieval evaluation or future training.",
            "Keep one authoritative provenance record per answer variant instead of silently merging clinical claims.",
            "Validate markup, URLs, licensing, and clinical accuracy in a separate qualified review.",
        ],
        "training_performed": False,
    }


def render_markdown(report: dict[str, object]) -> str:
    groups = report["multiple_answer_questions"]
    flags = report["content_flags"]
    sample_rows = "\n".join(
        f"| {item['question'].replace('|', '\\|')} | {item['source_rows']} | "
        f"{item['distinct_answers']} | {item['minimum_answer_similarity']:.3f} |"
        for item in report["sample_groups"]
    )
    recommendations = "\n".join(f"- {item}" for item in report["recommendations"])
    return f"""# Medical Q&A dataset audit

This report checks structure and repeated-question answer variants. It does not establish clinical correctness and does not train a model.

## Multi-answer questions

| Metric | Value |
| --- | ---: |
| Question groups with multiple distinct answers | {groups['question_groups']:,} |
| Source rows in those groups | {groups['rows_in_groups']:,} |
| Additional answer variants | {groups['additional_answer_variants']:,} |
| Groups below 0.35 token similarity | {groups['groups_below_0_35_similarity']:,} |
| Mean pairwise answer similarity | {groups['mean_pairwise_similarity']:.3f} |

## Content flags

| Check | Rows |
| --- | ---: |
| Answers with HTML-like markup | {flags['answers_with_html_like_markup']:,} |
| Answers with URLs | {flags['answers_with_urls']:,} |
| Answers with non-ASCII characters | {flags['answers_with_non_ascii_characters']:,} |

## Highest-variant sample

| Question | Source rows | Distinct answers | Minimum similarity |
| --- | ---: | ---: | ---: |
{sample_rows}

## Recommendations

{recommendations}
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_DATASET)
    parser.add_argument(
        "--output-dir", type=Path, default=Path(__file__).with_name("reports")
    )
    parser.add_argument("--sample-limit", type=int, default=20)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source = args.input.resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Dataset not found: {source}")
    if args.sample_limit < 1:
        raise ValueError("--sample-limit must be at least 1")

    report = audit_dataset(source, args.sample_limit)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    json_path = args.output_dir / "dataset_audit.json"
    markdown_path = args.output_dir / "dataset_audit.md"
    json_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    markdown_path.write_text(render_markdown(report), encoding="utf-8")
    print(f"Audited {report['rows']['total']:,} rows")
    print(f"JSON report: {json_path.resolve()}")
    print(f"Markdown report: {markdown_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
