"""Create deterministic SFT JSONL records from a prepared CSV; never trains.

==============================================================================
SFT RECORD PREPARATION PIPELINE (prepare_sft_records.py)
==============================================================================
Role:
  Transforms cleaned QA dataset splits into instruction-tuning JSONL records
  formatted according to the repository's prompt template.

------------------------------------------------------------------------------
MINDMAP FLOW: SFT RECORD EXTRACTION & FORMATTING
------------------------------------------------------------------------------
[Prepared CSV (e.g., train.csv)]
       │
       ├── 1. SHA-256 Digest Computation (source provenance tracking)
       ├── 2. Configuration Inspection (load_lora_config() -> prompt_template)
       ├── 3. Row Iteration & Normalization:
       │     ├── clean(question) & clean(answer)
       │     ├── Filter Incomplete Pairs (skip if either empty)
       │     └── Apply Prompt Template (e.g. "Question: {q}\\nAnswer: {a}")
       ├── 4. JSONL Serialization ({"text": ..., "question": ..., "answer": ...})
       └── 5. Metadata Output:
             └── Returns { source_sha256, records_written, records_skipped, training_performed: False }

------------------------------------------------------------------------------
ASCII FLOW: CSV TO JSONL TRANSFORMATION
------------------------------------------------------------------------------
  train.csv: row { question, answer }
        │
        ▼ clean()
  Normalized Text Strings
        │
        ▼ template.format(question=q, answer=a)
  { "text": "Question: ...\nAnswer: ...", "question": "...", "answer": "..." }
        │
        ▼ json.dumps() -> target.write()
  train.jsonl (Deterministic Instruction Tuning Data)
==============================================================================
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path

from lora_config import load_lora_config


def clean(value: str | None) -> str:
    """Normalize whitespace by collapsing multiple spaces, tabs, and newlines.

    Args:
        value: Input string or None.

    Returns:
        str: Collapsed single-space string.
    """
    return " ".join((value or "").split())


def convert_csv(source: Path, output: Path, limit: int | None = None) -> dict[str, object]:
    """Convert prepared CSV into newline-delimited JSONL records.

    Mindmap Flow:
    ```
    [convert_csv]
           │
           ├── 1. Load Template from lora_config.json
           ├── 2. Verify Column Presence (question, answer)
           ├── 3. Write UTF-8 JSON Lines
           └── 4. Produce Audit Summary
    ```

    Args:
        source: Source CSV file path.
        output: Destination JSONL file path.
        limit: Optional maximum record limit.

    Returns:
        dict[str, object]: Generation statistics and provenance hash.
    """
    if source.resolve() == output.resolve():
        raise ValueError("Output must not overwrite the source CSV")
    if limit is not None and limit < 1:
        raise ValueError("limit must be at least 1")
    _, raw_config = load_lora_config()
    dataset = raw_config["dataset"]
    question_column = dataset["question_column"]
    answer_column = dataset["answer_column"]
    template = dataset["prompt_template"]

    output.parent.mkdir(parents=True, exist_ok=True)
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    written = 0
    skipped = 0
    import os
    import tempfile
    temporary = None
    try:
        with source.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            missing = {question_column, answer_column} - set(reader.fieldnames or [])
            if missing:
                raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n", dir=output.parent, prefix=output.name + ".", suffix=".tmp", delete=False) as target:
                temporary = Path(target.name)
                for row in reader:
                    question = clean(row.get(question_column))
                    answer = clean(row.get(answer_column))
                    if not question or not answer:
                        skipped += 1
                        continue
                    record = {"text": template.format(question=question, answer=answer), "question": question, "answer": answer}
                    target.write(json.dumps(record, ensure_ascii=False) + "\n")
                    written += 1
                    if limit is not None and written >= limit:
                        break
        os.replace(temporary, output)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return {
        "source": str(source),
        "source_sha256": source_hash,
        "output": str(output),
        "records_written": written,
        "records_skipped": skipped,
        "training_performed": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Prepared CSV with question and answer columns")
    parser.add_argument("output", type=Path, help="Destination JSONL file")
    parser.add_argument("--limit", type=int, default=None, help="Optional record limit for inspection")
    args = parser.parse_args()
    print(json.dumps(convert_csv(args.source, args.output, args.limit), indent=2))


if __name__ == "__main__":
    main()
