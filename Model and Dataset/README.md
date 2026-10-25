# MedAssist AI - Dataset Profiling, Auditing & Preparation Pipeline

Welcome to the dataset utilities documentation for **MedAssist AI**, developed by **J Ganesh kumar reddy**.

This directory contains standalone, deterministic Python tools designed to profile, audit, clean, split, and validate the medical question-and-answer dataset without requiring heavy ML frameworks or performing model training.

---

## 1. Pipeline Architecture Overview

```
                          +-------------------------------------------------------+
                          | Source Dataset:                                       |
                          | Final data set for llm based health assitance (1).csv |
                          | (16,412 rows: question, answer)                       |
                          +-------------------------------------------------------+
                                        /                       \
                                       /                         \
                                      v                           v
                      +-----------------------------+   +-----------------------------+
                      |     analyze_dataset.py      |   |      audit_dataset.py       |
                      |   (Descriptive Profiler)    |   |  (Multi-Answer Similarity)  |
                      +-----------------------------+   +-----------------------------+
                                     |                                 |
                                     v                                 v
                         reports/dataset_analysis.json     reports/dataset_audit.json
                         reports/dataset_analysis.md       reports/dataset_audit.md
                                     \                                 /
                                      \                               /
                                       v                             v
                                  +---------------------------------------+
                                  |         prepare_dataset.py            |
                                  | (Deterministic SHA-256 Partitioning)  |
                                  +---------------------------------------+
                                                     |
                                                     v
                                  +---------------------------------------+
                                  | Target Split Directory (prepared/)    |
                                  | - train.csv      (80%)                |
                                  | - validation.csv (10%)                |
                                  | - test.csv       (10%)                |
                                  | - manifest.json  (SHA-256, counts)    |
                                  +---------------------------------------+
                                                     |
                                                     v
                                  +---------------------------------------+
                                  |          verify_splits.py             |
                                  |  (Cross-Partition Leakage Validator)  |
                                  +---------------------------------------+
                                                     |
                                                     v
                                          validation_report.json
                                          (0 Overlaps, 0 Contamination)
```

---

## 2. Dataset Pipeline Mindmap Flow

```
[Dataset Utilities]
  │
  ├── 1. Analysis Tool (analyze_dataset.py)
  │     ├── Descriptive statistical profiling
  │     ├── Word length percentiles (min, p25, median, mean, p75, p95, max)
  │     ├── Rule-based question intent classifier (symptoms, causes, etc.)
  │     ├── Answer length distribution bins (< 20, 20-99, 100-249, etc.)
  │     ├── Frequent medical terminology extraction
  │     └── Outputs: dataset_analysis.json & dataset_analysis.md
  │
  ├── 2. Variant Auditor (audit_dataset.py)
  │     ├── Pairwise Jaccard token similarity for repeated questions
  │     ├── Identifies divergent multi-answer groups (similarity < 0.35)
  │     ├── Content flags: HTML markup, URLs, non-ASCII characters
  │     ├── Cryptographic file hashing (SHA-256)
  │     └── Outputs: dataset_audit.json & dataset_audit.md
  │
  ├── 3. Deterministic Preparer (prepare_dataset.py)
  │     ├── Drops empty questions and answers
  │     ├── Drops answers under 5 words
  │     ├── Deduplicates questions: retains the longest answer
  │     ├── Stable question splitting via SHA-256 modulo 100:
  │     │     ├── [0..79]  ──► train.csv (80%)
  │     │     ├── [80..89] ──► validation.csv (10%)
  │     │     └── [90..99] ──► test.csv (10%)
  │     └── Outputs: train.csv, validation.csv, test.csv, manifest.json
  │
  ├── 4. Split Leakage Validator (verify_splits.py)
  │     ├── Verifies completeness of split files on disk
  │     ├── Asserts zero missing rows and zero intra-split duplicates
  │     ├── Asserts zero cross-split question leakage:
  │     │     ├── train ∩ validation == 0
  │     │     ├── train ∩ test == 0
  │     │     └── validation ∩ test == 0
  │     └── Outputs: validation_report.json (exits 0 on pass, 1 on fail)
  │
  ├── 5. Automated Unit Tests (test_dataset_tools.py)
  │     └── Standard library unittest discovering tool correctness
  │
  └── 6. Legacy Colab Experiment (Fine-tunned model.py)
        └── Historical reference script for parameter-efficient GPT-2 LoRA fine-tuning
```

---

## 3. Core ASCII Flows

### Flow A: Deterministic Question-Level Hashing Split

```
[Clean Normalized Question: "What are symptoms of asthma?"]
                         │
                         ▼
           SHA-256 Hash of Question String
         (e.g., "7f83b1657ff1fc53b92dc18...")
                         │
                         ▼
        Extract First 8 Hex Characters: "7f83b165"
                         │
                         ▼
          Convert to Integer: 2,139,337,061
                         │
                         ▼
                   Modulo 100: 61
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
        [0..79]       [80..89]      [90..99]
     (Train: 80%)  (Valid: 10%)   (Test: 10%)
           │
           ▼
  Assigned to train.csv (Deterministic: same question ALWAYS lands in same split)
```

---

### Flow B: Cross-Split Zero-Leakage Validation

```
Train Split Questions Set       Validation Questions Set       Test Split Questions Set
   (e.g. 11,476 items)             (e.g. 1,435 items)            (e.g. 1,434 items)
           │                               │                             │
           ├───────────────────────────────┼─────────────────────────────┤
           ▼                               ▼                             ▼
   [Train ∩ Validation]            [Train ∩ Test]              [Validation ∩ Test]
           │                               │                             │
           ▼                               ▼                             ▼
       Overlap: 0                      Overlap: 0                    Overlap: 0
           │                               │                             │
           └───────────────────────────────┼─────────────────────────────┘
                                           ▼
                    Passed: True (Strict Zero Cross-Contamination)
```

---

## 4. Dataset Profile & Audit Summary

Based on the committed reports generated from `Final data set for llm based health assitance (1).csv`:

| Metric | Source Finding |
| :--- | :--- |
| **Total Source Rows** | 16,412 rows |
| **Valid Q&A Pairs** | 16,407 rows (5 missing answers dropped) |
| **Unique Normalized Questions** | 14,345 unique questions |
| **Exact Duplicate Rows** | 48 duplicate pairs |
| **Repeated Question Rows** | 2,062 repeated question instances |
| **Median Question Length** | 7 words (min: 3, max: 26) |
| **Median Answer Length** | 132 words (min: 1, max: 4,133) |
| **Multi-Answer Question Groups** | 1,396 question keys mapping to > 1 distinct answer |
| **Divergent Groups (< 0.35 similarity)**| 1,128 groups requiring clinical review |
| **Answers with URLs** | 159 answers |
| **Answers with Non-ASCII Characters** | 61 answers |

---

## 5. Running Dataset Scripts & Tests

### Run Automated Unit Tests
```powershell
python -m unittest discover -s "Model and Dataset" -p "test_*.py"
```

### Generate Analysis & Audit Reports
```powershell
python "Model and Dataset/analyze_dataset.py"
python "Model and Dataset/audit_dataset.py"
```

### Deterministically Clean & Split the Dataset
```powershell
python "Model and Dataset/prepare_dataset.py" --output-dir .\prepared-data
```

### Verify Splits for Zero Leakage
```powershell
python "Model and Dataset/verify_splits.py" --input-dir .\prepared-data
```
