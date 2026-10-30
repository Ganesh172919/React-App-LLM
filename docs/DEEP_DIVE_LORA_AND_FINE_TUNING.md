# MedAssist AI — Mathematical & Engineering Guide to LoRA & Model Fine-Tuning

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Theoretical Foundations: Pre-Training vs. Supervised Fine-Tuning (SFT)

The development lifecycle of specialized health and biomedical language models comprises two mathematically distinct training regimes:

### 1.1 Unsupervised Autoregressive Causal Pre-Training
A transformer foundation model with parameters $\theta$ is optimized over an unlabelled token corpus $\mathcal{U} = (u_1, u_2, \dots, u_N)$ by minimizing the negative log-likelihood:
$$\mathcal{L}_{\text{pre}}(\theta) = - \sum_{i=1}^{N} \log P_\theta(u_i \mid u_{1}, u_{2}, \dots, u_{i-1})$$

While this imparts broad linguistic representations and associative world knowledge, the base model functions strictly as a probabilistic continuation engine. When queried with clinical inquiries (*"What are the diagnostic signs of pulmonary embolism?"*), a raw base model may output further questions, transcribe textbook indices, or hallucinate answers.

### 1.2 Supervised Instruction Fine-Tuning (SFT)
Supervised Fine-Tuning conditions the model to behave as an instruction-following assistant. Given a curated dataset of prompt-target pairs $\mathcal{D} = \{(x^{(j)}, y^{(j)})\}_{j=1}^{|\mathcal{D}|}$, SFT maximizes the conditional log-likelihood of response tokens $y = (y_1, y_2, \dots, y_m)$ conditioned on instruction tokens $x = (x_1, x_2, \dots, x_n)$:
$$\mathcal{L}_{\text{SFT}}(\theta) = - \sum_{j=1}^{|\mathcal{D}|} \sum_{t=1}^{m_j} \log P_\theta(y_t^{(j)} \mid x^{(j)}, y_{<t}^{(j)})$$

---

## 2. Computational Bottlenecks of Full Fine-Tuning (FFT)

In Full Fine-Tuning, every parameter in $\theta \in \mathbb{R}^d$ is updated during backpropagation using optimizers like AdamW.

### 2.1 AdamW State-Space Memory Footprint
For a model with $|\theta|$ parameters:
1. **Model Weights (FP16/BF16)**: $2 \times |\theta|$ bytes.
2. **Backpropagated Gradients (FP16/BF16)**: $2 \times |\theta|$ bytes.
3. **First Moment Vector $m_t$ (FP32)**: $4 \times |\theta|$ bytes.
4. **Second Moment Vector $v_t$ (FP32)**: $4 \times |\theta|$ bytes.
5. **Master Weights Copy (FP32)**: $4 \times |\theta|$ bytes.

$$\text{Memory}_{\text{optimizer}}(\theta) = (2 + 2 + 4 + 4 + 4) \times |\theta| = 16 \times |\theta| \text{ bytes}$$

For a 7-billion parameter clinical model ($|\theta| = 7 \times 10^9$):
$$\text{Memory}_{\text{optimizer}} = 16 \times 7 \times 10^9 = 112 \text{ Gigabytes}$$
When adding KV-cache and forward activation buffers, total VRAM exceeds $140\text{ GB}$, necessitating multi-GPU enterprise infrastructure (e.g., $2 \times \text{NVIDIA A100 } 80\text{GB}$).

```
====================================================================================================
               FULL FINE-TUNING (FFT) vs LOW-RANK ADAPTATION (LoRA) COMPARISON
====================================================================================================

  FULL FINE-TUNING (All Weights Updated):
  Input Vector x ──► [ W_0 + Delta W ] (d x k parameters) ──► Output Vector h
                     All weights updated; requires 16x bytes optimizer overhead.

  LOW-RANK ADAPTATION (LoRA Bottleneck Decomposition):
                     ┌───────────────────┐
                     │   Frozen Base     │
  Input Vector x ─┬─►│     Weight W_0    │──────────────────────(+)──► Output Vector h
                  │  │     (d x k)       │                       ▲
                  │  └───────────────────┘                       │
                  │                                              │
                  │  ┌───────────────────┐      ┌─────────────┐  │
                  │  │ Down-Projection A │      │ Up-Proj B   │  │
                  └─►│ (r x k)           │─────►│ (d x r)     │──┘
                     │ Gaussian N(0, 1/r)│      │ Zero Init 0 │  Scaled by (alpha / r)
                     └───────────────────┘      └─────────────┘
```

---

## 3. Mathematical Formulation of Low-Rank Adaptation (LoRA)

Low-Rank Adaptation (Hu et al., 2021) leverages the **Intrinsic Dimensionality Hypothesis** (Aghajanyan et al., 2020): parameter updates $\Delta W$ for downstream tasks occupy a subspace of dramatically lower intrinsic dimension.

### 3.1 Matrix Decomposition
For a frozen pre-trained projection matrix $W_0 \in \mathbb{R}^{d \times k}$, the adapted weight is $W = W_0 + \Delta W$. LoRA decomposes $\Delta W$ into the product of two low-rank matrices:
$$\Delta W = \frac{\alpha}{r} (B \cdot A)$$

Where:
- $r \ll \min(d, k)$ is the low-rank bottleneck dimension (e.g., $r = 8$).
- $A \in \mathbb{R}^{r \times k}$ is initialized with Gaussian noise $\mathcal{N}(0, \sigma^2)$ where $\sigma = 1/r$.
- $B \in \mathbb{R}^{d \times r}$ is initialized to zero ($B = 0$), ensuring $\Delta W = 0$ at step $0$.
- $\alpha$ is a constant scaling hyperparameter; $\frac{\alpha}{r}$ stabilizes training across different rank choices.

### 3.2 Forward Pass Computation
Given input activation vector $x \in \mathbb{R}^{k}$:
$$h = W_0 x + \Delta W x = W_0 x + \frac{\alpha}{r} B (A x)$$

### 3.3 Gradient Backpropagation Through Bottlenecks
During training, base weights $W_0$ remain frozen ($\nabla_{W_0} \mathcal{L} = 0$). Gradients propagate exclusively through $B$ and $A$:
$$\frac{\partial \mathcal{L}}{\partial B} = \frac{\alpha}{r} \left( \frac{\partial \mathcal{L}}{\partial h} \right) (A x)^T \in \mathbb{R}^{d \times r}$$
$$\frac{\partial \mathcal{L}}{\partial A} = \frac{\alpha}{r} B^T \left( \frac{\partial \mathcal{L}}{\partial h} \right) x^T \in \mathbb{R}^{r \times k}$$

---

## 4. Parameter & Memory Derivations for GPT-2 Baseline

In MedAssist AI's offline validation suite ([`Model and Dataset/lora/validate_lora_setup.py`](file:///c:/Users/RAVIPRAKASH/React-App-LLM/Model%20and%20Dataset/lora/validate_lora_setup.py)), trainable adapter parameters are derived via closed-form analytical equations:

$$P_{\text{adapter}} = L \times P \times 2 \times d_{\text{model}} \times r$$

Where:
- Transformer Layers $L = 12$
- Target Projection Heads $P = 1$ (targeting fused `c_attn` projections)
- Hidden Dimension $d_{\text{model}} = 768$
- Adapter Rank $r = 8$

$$P_{\text{adapter}} = 12 \times 1 \times 2 \times 768 \times 8 = \mathbf{147,456 \text{ Trainable Parameters}}$$

### Memory Footprint:
$$\text{Memory}_{\text{FP16}} = \frac{147,456 \times 2 \text{ bytes}}{1,048,576 \text{ bytes/MB}} = \mathbf{0.28125 \text{ MB}} \approx 288 \text{ KB}$$

This yields a **99.88% reduction in trainable parameters** relative to the 124M parameter base model.

---

## 5. LoRA Engineering Mindmap

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((LoRA & PEFT Pipeline))
    ::icon(fa fa-brain)
    (01 Mathematical Foundations)
      Intrinsic Dimensionality
      Low-Rank Matrix Decomposition
      Forward Pass Scaling alpha over r
      Backpropagation Gradients
    (02 Parameter Estimation)
      GPT-2 Baseline Architecture
        Layers L equals 12
        Hidden Size H equals 768
        Target Projections c_attn
        Bottleneck Rank r equals 8
      Total Params 147,456
      FP16 Storage 0.281 MB
    (03 Data Hygiene & Quarantine)
      Multi-Answer Group Audit
      Jaccard Token Similarity
      1,437 Ambiguous Groups Isolated
      Zero-Leakage Hash Partitioning
        80 Percent Train Set
        10 Percent Validation Set
        10 Percent Test Set
    (04 SFT Training Pipeline)
      Prompt Label Masking minus 100
      Cross-Entropy Loss on Targets
      Dry-Run Manifest Inspection
      Review Gate Enforcements
        Clinical Review Gate
        License Verification Gate
```

---

## 6. SFT Label Masking & Loss Formulation

When fine-tuning on question-answer records, standard causal language modeling trains the network to predict prompt tokens and answer tokens indiscriminately. In [`train_lora.py`](file:///c:/Users/RAVIPRAKASH/React-App-LLM/Model%20and%20Dataset/lora/train_lora.py), **Label Masking** is enforced:

$$\tilde{t}_i = \begin{cases} -100 & \text{if token } i \text{ belongs to prompt prefix ("Question: ...\\nAnswer: ")} \\ t_i & \text{if token } i \text{ belongs to target answer} \end{cases}$$

PyTorch cross-entropy loss ignores tokens with value `-100`, ensuring gradients optimize adapter weights strictly for clinical answer generation:

```
[Token Sequence Input]
Token:  [ Question: | What | is | asthma? | \n | Answer: | Asthma | is | a | chronic | disease. ]
Labels: [   -100    | -100 | -100|  -100  | -100|  -100  | Asthma | is | a | chronic | disease. ]
Loss:   [ ◄──────────────── IGNORED (0 Loss) ──────────► | ◄───── OPTIMIZED (Cross-Entropy) ──► ]
```

---

## 7. Dataset Quarantine & Partitioning Implementation

The offline preparation script ([`Model and Dataset/lora/build_lora_package.py`](file:///c:/Users/RAVIPRAKASH/React-App-LLM/Model%20and%20Dataset/lora/build_lora_package.py)) identifies and isolates ambiguous multi-answer questions into `quarantine.jsonl`:

```python
# Model and Dataset/lora/build_lora_package.py
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
            question = " ".join((row.get("question") or "").split())
            answer = " ".join((row.get("answer") or "").split())
            if question and answer:
                variants[leakage_key(question)].add(answer.casefold())

    # Quarantine any question associated with divergent answers
    ambiguous = {key for key, values in variants.items() if len(values) > 1}
    records, cleaning = load_and_clean(source, 5)
    accepted = [row for row in records if leakage_key(row["question"]) not in ambiguous]

    output.mkdir(parents=True, exist_ok=True)
    splits = {name: [row for row in accepted if stable_split(row["question"]) == name]
              for name in ("train", "validation", "test")}

    for name, rows in splits.items():
        write_split(output / (name + ".csv"), rows)
        convert_csv(output / (name + ".csv"), output / (name + ".jsonl"))

    source_hash = file_sha256(source)
    manifest = {
        "schema_version": 1,
        "source_file": source.name,
        "source_sha256": source_hash,
        "method": "Canonical question SHA-256 groups, approximate 80/10/10",
        "cleaning": cleaning,
        "quarantined_question_groups": len(ambiguous),
        "splits": {name: len(rows) for name, rows in splits.items()},
        "split_sha256": {name: file_sha256(output / (name + ".csv")) for name in splits},
        "jsonl_sha256": {name: file_sha256(output / (name + ".jsonl")) for name in splits},
        "clinical_review_approved": False,
        "license_review_approved": False,
        "reviewer": None,
        "training_performed": False,
    }

    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    with (output / "provenance.jsonl").open("w", encoding="utf-8") as handle:
        for row in accepted:
            handle.write(json.dumps({
                "record_id": hashlib.sha256(leakage_key(row["question"]).encode()).hexdigest(),
                "source_sha256": source_hash,
                "source_url": None,
                "license": "unverified",
                "review_status": "pending",
                "split": stable_split(row["question"]),
            }) + "\n")

    with (output / "quarantine.jsonl").open("w", encoding="utf-8") as handle:
        for key in sorted(ambiguous):
            handle.write(json.dumps({
                "question_key": key,
                "reason": "multiple distinct answers; human review required",
                "variant_count": len(variants[key]),
            }) + "\n")

    validation = validate_splits(output)
    (output / "validation_report.json").write_text(json.dumps(validation, indent=2) + "\n", encoding="utf-8")
    if not validation["passed"]:
        raise ValueError("Prepared data failed split validation.")

    return manifest
```

---

## 8. Closed-Form Parameter Validation Script (`Model and Dataset/lora/validate_lora_setup.py`)

```python
# Model and Dataset/lora/validate_lora_setup.py
from __future__ import annotations
import argparse
import json
from pathlib import Path
from lora_config import load_lora_config

def estimate_adapter_parameters(hidden_size: int, layers: int, projections_per_layer: int, rank: int) -> int:
    """Calculate exact number of trainable parameters in LoRA matrices."""
    # Each projection decomposes into: Down-proj (H * R) + Up-proj (R * H) = 2 * H * R
    return layers * projections_per_layer * 2 * hidden_size * rank

def calculate_memory_footprint_mb(parameter_count: int, bytes_per_param: int = 2) -> float:
    """Compute FP16 storage footprint in megabytes."""
    return (parameter_count * bytes_per_param) / (1024 * 1024)

def build_report(config_path: Path | None, hidden_size: int, layers: int) -> dict[str, object]:
    """Assemble a comprehensive analytical report of the LoRA configuration."""
    settings, _ = load_lora_config(config_path)
    estimated_parameters = estimate_adapter_parameters(
        hidden_size, layers, len(settings.target_modules), settings.rank
    )
    return {
        "valid": True,
        "training_performed": False,
        "base_model": settings.base_model,
        "task_type": settings.task_type,
        "rank": settings.rank,
        "alpha": settings.alpha,
        "dropout": settings.dropout,
        "target_modules": list(settings.target_modules),
        "max_sequence_length": settings.max_sequence_length,
        "estimate_assumptions": {
            "hidden_size": hidden_size,
            "layers": layers,
            "projections_per_layer": len(settings.target_modules),
        },
        "estimated_adapter_parameters": estimated_parameters,
        "estimated_fp16_megabytes": round(estimated_parameters * 2 / 1_048_576, 3),
        "note": "Analytical estimate only; no model was downloaded or trained.",
    }
```

---

## 9. Review-Gated SFT Training Pipeline (`Model and Dataset/lora/train_lora.py`)

The SFT training script enforces strict clinical board sign-off and license verification gates. By default, it operates in **safe dry-run inspection mode**, verifying SHA-256 hashes of all partitions against `manifest.json` without allocating GPU memory or downloading base weights:

```python
# Model and Dataset/lora/train_lora.py (Review Gates & Tokenization)
def inspect_job(data_dir: Path) -> dict:
    settings, raw = load_lora_config()
    manifest = json.loads((data_dir / "manifest.json").read_text(encoding="utf-8"))
    counts = {}
    for name in ("train", "validation", "test"):
        source = data_dir / (name + ".jsonl")
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if digest != manifest.get("jsonl_sha256", {}).get(name):
            raise ValueError("JSONL hash mismatch: " + name)
        with source.open(encoding="utf-8") as handle:
            rows = [json.loads(line) for line in handle if line.strip()]
        if not rows or any(not row.get("question") or not row.get("answer") or not row.get("text") for row in rows):
            raise ValueError("Empty or invalid SFT split: " + name)
        if len(rows) != manifest["splits"][name]:
            raise ValueError("Manifest count mismatch: " + name)
        counts[name] = len(rows)
    return {
        "base_model": settings.base_model,
        "rank": settings.rank,
        "alpha": settings.alpha,
        "target_modules": list(settings.target_modules),
        "counts": counts,
        "data_source_sha256": manifest["source_sha256"],
        "clinical_review_approved": manifest.get("clinical_review_approved") is True,
        "license_review_approved": manifest.get("license_review_approved") is True,
        "reviewer": manifest.get("reviewer"),
        "training_performed": False,
        "config": raw
    }

# Review Gate Enforcement in main()
report = inspect_job(args.data_dir)
if not args.train:
    print(json.dumps(report, indent=2))
    return

if not report["clinical_review_approved"] or not report["license_review_approved"] or not report["reviewer"]:
    raise SystemExit("Training blocked: the exact hashed dataset requires documented clinical/license review and a named reviewer.")

# SFT Label Masking (-100 on prompt tokens)
def tokenize(row):
    prefix = "Question: " + row["question"] + "\nAnswer: "
    tokens = tokenizer(prefix + row["answer"] + tokenizer.eos_token, max_length=settings.max_sequence_length, truncation=True)
    prompt_length = len(tokenizer(prefix, add_special_tokens=False)["input_ids"])
    tokens["labels"] = [-100] * min(prompt_length, len(tokens["input_ids"])) + tokens["input_ids"][prompt_length:]
    return tokens
```

---

## 10. Isolated CLI Inference (`Model and Dataset/lora/infer_adapter.py`)

```python
# Model and Dataset/lora/infer_adapter.py
"""Standalone CLI inference with a trained adapter. Not used by the web app."""
import argparse
from pathlib import Path
from peft import AutoPeftModelForCausalLM
from transformers import AutoTokenizer

DISCLAIMER = "Educational demonstration only. Not medical advice."

def generate(adapter_dir: Path, question: str, max_new_tokens: int = 120) -> str:
    tokenizer = AutoTokenizer.from_pretrained(str(adapter_dir))
    model = AutoPeftModelForCausalLM.from_pretrained(str(adapter_dir))
    prompt = "Question: " + question.strip() + "\nAnswer: "
    inputs = tokenizer(prompt, return_tensors="pt")
    output = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False, pad_token_id=tokenizer.eos_token_id)
    return tokenizer.decode(output[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
```

---

## 11. Multi-Rank LoRA Scaling Analysis

The table below illustrates parameter scaling across different low-rank bottleneck dimensions for a 12-layer transformer with $d_{\text{model}} = 768$:

| Rank ($r$) | Scaling ($\alpha/r$) | Down $A$ ($r \times 768$) | Up $B$ ($768 \times r$) | Layer Params ($2 \times 768 \times r$) | Total Params ($12 \times L_{\text{params}}$) | FP16 Size | Param Reduction |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **$r = 4$** | $16 / 4 = 4.0$ | 3,072 | 3,072 | 6,144 | **73,728** | 0.141 MB | 99.94% |
| **$r = 8$ (Default)** | $16 / 8 = 2.0$ | 6,144 | 6,144 | 12,288 | **147,456** | **0.281 MB** | **99.88%** |
| **$r = 16$** | $16 / 16 = 1.0$ | 12,288 | 12,288 | 24,576 | **294,912** | 0.563 MB | 99.76% |
| **$r = 32$** | $16 / 32 = 0.5$ | 24,576 | 24,576 | 49,152 | **589,824** | 1.125 MB | 99.53% |
| **$r = 64$** | $16 / 64 = 0.25$ | 49,152 | 49,152 | 98,304 | **1,179,648** | 2.250 MB | 99.05% |

---

## 12. Operational Execution & Verification Runbook

```powershell
# 1. Profile and audit the source dataset
python "Model and Dataset/analyze_dataset.py"
python "Model and Dataset/audit_dataset.py"

# 2. Build LoRA package: quarantine ambiguous records and hash splits
python "Model and Dataset/lora/build_lora_package.py"

# 3. Verify zero-leakage hash partitioning
python "Model and Dataset/verify_splits.py"

# 4. Perform closed-form parameter estimation (no GPU or model download)
python "Model and Dataset/lora/validate_lora_setup.py" --output "Model and Dataset/reports/lora_validation.json"

# 5. Execute safe dry-run inspection of SFT job
python "Model and Dataset/lora/train_lora.py"

# 6. Run automated test suites across dataset and LoRA packages
python -m unittest discover -s "Model and Dataset" -p "test_*.py"
python -m unittest discover -s "Model and Dataset/lora" -p "test_*.py"
```
