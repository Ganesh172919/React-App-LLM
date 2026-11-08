---
title: "How to Train and Validate MedQuAD/PubMedQA LoRA Adapters"
description: "Execution runbook for fine-tuning biomedical LLM adapters with PyTorch, Hugging Face PEFT, and 4-bit QLoRA using the MedAssist pipeline."
quadrant: how-to
audience: [developer, auditor]
owner: "@medassist-team"
status: stable
last_reviewed: 2026-11-08
review_every_days: 90
applies_to: ">=1.0.0"
source_of_truth: ["Model and Dataset/lora/TRAINING_RUNBOOK.md", "Model and Dataset/lora/train_lora.py", "Model and Dataset/lora/validate_lora_setup.py"]
---

# How to Train and Validate MedQuAD/PubMedQA LoRA Adapters

This guide outlines the offline training procedure for fine-tuning Parameter-Efficient Low-Rank Adapters (LoRA) and 4-bit Quantized LoRA (QLoRA) models for clinical domain grounding.

---

## Prerequisites

- **Python:** 3.10 or newer with PyTorch 2.2+ installed.
- **CUDA Toolkit:** 12.1+ with an NVIDIA GPU having at least 16 GB VRAM for 7B models or 8 GB VRAM for QLoRA.
- Virtual environment with training dependencies:

```bash
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r "Model and Dataset/lora/requirements-training.txt"
pip install -r "Model and Dataset/lora/requirements-qlora.txt"
```

---

## Step 1: Preprocess Dataset and Isolate Ambiguous Records

Execute `build_lora_package.py` to ingest the raw medical Q&A corpus, detect ambiguous questions, and perform a deterministic hash-based split:

```bash
python "Model and Dataset/lora/build_lora_package.py"
```

What this does:
1. **Ambiguity Quarantine:** Quarantines 1,437 ambiguous question groups (3,535 rows) into `quarantine.jsonl` to prevent model confusion.
2. **Zero-Leakage Split:** Partitions the remaining clean records into `train.jsonl` (80%), `val.jsonl` (10%), and `test.jsonl` (10%) using SHA-256 modulo 100 on normalized prompt strings.

---

## Step 2: Validate Parameter Math and Configuration

Verify that the rank, alpha, target modules, and memory footprint match theoretical closed-form estimates:

```bash
python "Model and Dataset/lora/validate_lora_setup.py"
```

The script verifies:
- **LoRA Rank ($r$):** 8
- **LoRA Alpha ($\alpha$):** 16 (scaling factor $\alpha/r = 2.0$)
- **Target Modules:** Query and value attention projection matrices (`q_proj`, `v_proj` or `c_attn`).
- **Closed-Form Parameter Formula:**
  $$P = L \times P_{\text{heads}} \times 2 \times d_{\text{model}} \times r$$
  For example, for a 12-layer GPT-2 baseline, this adds 147,456 trainable parameters (0.281 MB FP16) while keeping 99.88% of base weights frozen.

---

## Step 3: Execute Training Dry-Run

Run a single-batch synthetic dry-run to ensure the training loop, loss computation, and optimizer step execute without CUDA OOM or device synchronization errors:

```bash
python "Model and Dataset/lora/train_lora.py" --dry-run
```

Expected result:
```text
Dry-run completed successfully. Synthetic batch forward/backward pass verified.
```

---

## Step 4: Run Full LoRA Fine-Tuning

Launch fine-tuning using the prepared `train.jsonl` and `val.jsonl` datasets:

```bash
python "Model and Dataset/lora/train_lora.py" \
  --base-model "meta-llama/Meta-Llama-3-8B-Instruct" \
  --train-file "Model and Dataset/lora/train.jsonl" \
  --val-file "Model and Dataset/lora/val.jsonl" \
  --output-dir "Model and Dataset/lora/checkpoints" \
  --epochs 3 \
  --lr 2e-4 \
  --batch-size 4 \
  --gradient-accumulation-steps 4 \
  --lora-r 8 \
  --lora-alpha 16
```

---

## Step 5: Evaluate Adapter on Test Cases

Run inference against the frozen benchmark cases in `evaluation_cases.json`:

```bash
python "Model and Dataset/lora/infer_adapter.py" \
  --adapter-path "Model and Dataset/lora/checkpoints" \
  --cases-file "Model and Dataset/lora/evaluation_cases.json"
```

Evaluate outputs for:
- Medical domain accuracy and groundedness.
- Complete absence of fabricated medical advice or definitive patient diagnoses.
- Correct inclusion of clinical consultation disclaimers.

---

**Evidence:** `Model and Dataset/lora/TRAINING_RUNBOOK.md`, `Model and Dataset/lora/build_lora_package.py`, `Model and Dataset/lora/train_lora.py`, `Model and Dataset/lora/validate_lora_setup.py`.
