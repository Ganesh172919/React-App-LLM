# MedAssist AI — AI Fine-Tuning, Low-Rank Adaptation (LoRA) & Dataset Guide

Developed by **J Ganesh kumar reddy**  
*Full-Stack Educational Health Assistance, Biomedical Evidence Grounding, & Machine Learning Research Platform*

---

## 1. Theoretical Foundations of Model Fine-Tuning

### 1.1 Pre-Training vs. Instruction Fine-Tuning
Modern Large Language Models (LLMs) are trained in two distinct phases:

1. **Self-Supervised Pre-Training**: The model processes trillions of general text tokens predicting the next token ($P(w_t \mid w_{<t})$). This produces broad linguistic fluency and world knowledge, but the model behaves as a raw text completer rather than an aligned, instruction-following assistant.
2. **Supervised Fine-Tuning (SFT)**: The pre-trained base model is adapted to a curated dataset of instruction-response pairs $(x, y)$. The objective is to maximize the likelihood of generating the target answer $y = (y_1, y_2, \dots, y_m)$ given user prompt $x = (x_1, x_2, \dots, x_n)$:
   $$\mathcal{L}_{\text{SFT}}(\theta) = - \sum_{i=1}^{m} \log P_\theta(y_i \mid x, y_{<i})$$

### 1.2 The Bottleneck of Full Fine-Tuning (FFT)
In Full Fine-Tuning, every parameter $\theta$ in the neural network is updated via backpropagation:
- **Optimizer Memory Explosion**: Training with AdamW requires maintaining the model weights $\theta$ (FP16/BF16: 2 bytes/param), gradients $\nabla \mathcal{L}$ (2 bytes/param), first momentum buffer $m_t$ (FP32: 4 bytes/param), and second variance buffer $v_t$ (FP32: 4 bytes/param). A 7B parameter model requires upwards of 80 to 120 GB of VRAM solely for optimizer states.
- **Catastrophic Forgetting**: Updating all weights disrupts representations learned during pre-training, causing degradation in general reasoning and factual accuracy outside the training distribution.
- **Storage & Deployment Costs**: Storing complete model checkpoints for every specialized domain or task is impractical.

```
========================================================================================================================
                                     LOW-RANK ADAPTATION (LoRA) BOTTLENECK MECHANISM
========================================================================================================================

                         ┌──────────────────────────┐
                         │   Frozen Base Weights    │
      Input Vector x ──┬─►│           W0             │─────────────────────────(+)──► Output Vector h
                       │ │         (d x k)          │                          ▲
                       │ └──────────────────────────┘                          │
                       │                                                       │
                       │ ┌──────────────────────────┐     ┌─────────────────┐  │
                       │ │   Down-Projection A      │     │  Up-Proj B      │  │
                       └─►│   (Dimension r x k)      │────►│  (Dimension d x r)│──┘
                         │   Gaussian ~ N(0, 1/r)   │     │  Initialized = 0│  Scaled by (alpha / r)
                         └──────────────────────────┘     └─────────────────┘
========================================================================================================================
```

---

## 2. LoRA Capabilities Mindmap

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#0284c7', 'primaryTextColor': '#ffffff', 'primaryBorderColor': '#0369a1', 'lineColor': '#0284c7', 'secondaryColor': '#0d9488', 'tertiaryColor': '#6366f1' }}}%%
mindmap
  root((LoRA & PEFT Guide))
    ::icon(fa fa-brain)
    (01 Low-Rank Mathematics)
      Intrinsic Dimensionality
      Delta W equals alpha over r times B A
      Forward Pass h equals W0 x plus Delta W x
      Gradients Propagate Only Through A and B
    (02 Parameter Estimation)
      Target c_attn in GPT-2
      12 Layers, 768 Hidden, Rank 8
      147,456 Trainable Parameters
      0.281 MB FP16 Adapter Size
      99.88% Parameter Reduction
    (03 Dataset Hygiene & Splits)
      1,437 Ambiguous Question Groups Quarantined
      SHA-256 Modulo 100 Splitting
      Zero-Leakage Guarantee
      Train (80%), Val (10%), Test (10%)
    (04 SFT Training Controls)
      Prompt Label Masking (-100)
      Zero Loss on Prompt Prefix
      Clinical Review Approval Gate
      Dry-Run Verification Script
```

---

## 3. Mathematical Parameter Derivations & Memory Profile

Trainable adapter parameters for GPT-2 are derived analytically:

$$P_{\text{adapter}} = L \times P \times 2 \times d_{\text{model}} \times r$$

Where:
- Transformer Layers $L = 12$
- Target Projection Heads $P = 1$ (`c_attn`, fusing Query, Key, and Value)
- Hidden Dimension $d_{\text{model}} = 768$
- LoRA Bottleneck Rank $r = 8$

$$P_{\text{adapter}} = 12 \times 1 \times 2 \times 768 \times 8 = \mathbf{147,456 \text{ trainable parameters}}$$

### Memory Footprint:
$$\text{Storage}_{\text{FP16}} = \frac{147,456 \times 2 \text{ bytes}}{1,048,576 \text{ bytes/MB}} = \mathbf{0.28125 \text{ MB}} \approx 288 \text{ KB}$$

### Gradient Flow Equations:
During backpropagation, gradients are only calculated and stored for $A$ and $B$, while base weights $W_0$ receive zero updates:

$$\frac{\partial \mathcal{L}}{\partial A} = \frac{\alpha}{r} B^T \left(\frac{\partial \mathcal{L}}{\partial h}\right) x^T$$

$$\frac{\partial \mathcal{L}}{\partial B} = \frac{\alpha}{r} \left(\frac{\partial \mathcal{L}}{\partial h}\right) (Ax)^T$$

```
========================================================================================================================
                                     GRADIENT BACKPROPAGATION THROUGH LOW-RANK BOTTLENECK
========================================================================================================================

                 Loss Function L
                       │
                       ▼
             dL/dh (Output Gradient)
                  ┌────┴──────────────────────────┐
                  │                               │
                  ▼                               ▼
          dL/dB = (dL/dh)(Ax)^T           dL/dA = B^T(dL/dh)x^T
        Updated via AdamW               Updated via AdamW
                  │                               │
                  └───────────────┬───────────────┘
                                  │
                                  ▼
                     dL/dW0 = 0 (Frozen Base Weights)
========================================================================================================================
```

---

## 4. Key Implementation Code Snippets

### 4.1 Closed-Form Parameter Calculation (`Model and Dataset/lora/validate_lora_setup.py`)

```python
# Implementation Snippet: Model and Dataset/lora/validate_lora_setup.py
def estimate_adapter_parameters(hidden_size: int, layers: int, projections_per_layer: int, rank: int) -> int:
    """Calculate exact number of trainable parameters in LoRA matrices."""
    return layers * projections_per_layer * 2 * hidden_size * rank

def calculate_memory_footprint_mb(parameter_count: int, bytes_per_param: int = 2) -> float:
    """Compute FP16 storage footprint in megabytes."""
    return (parameter_count * bytes_per_param) / (1024 * 1024)
```

### 4.2 SFT Prompt Label Masking (`Model and Dataset/lora/train_lora.py`)

```python
# Implementation Snippet: Model and Dataset/lora/train_lora.py
def tokenize_and_mask(record, tokenizer, max_length=512):
    prompt_text = f"Question: {record['question']}\nAnswer: "
    full_text = prompt_text + record['answer']
    
    prompt_ids = tokenizer(prompt_text, truncation=True, max_length=max_length)["input_ids"]
    full_ids = tokenizer(full_text, truncation=True, max_length=max_length)["input_ids"]
    
    # Mask prompt tokens with -100 so they are ignored in cross-entropy loss calculation
    labels = [-100] * len(prompt_ids) + full_ids[len(prompt_ids):]
    return {"input_ids": full_ids, "labels": labels}
```

### 4.3 Isolated Adapter Inference (`Model and Dataset/lora/infer_adapter.py`)

```python
# Implementation Snippet: Model and Dataset/lora/infer_adapter.py
from peft import AutoPeftModelForCausalLM
from transformers import AutoTokenizer

def run_isolated_inference(adapter_path, prompt):
    model = AutoPeftModelForCausalLM.from_pretrained(adapter_path)
    tokenizer = AutoTokenizer.from_pretrained(adapter_path)
    tokens = tokenizer("Question: " + prompt + "\nAnswer: ", return_tensors="pt")
    outputs = model.generate(**tokens, max_new_tokens=150, do_sample=False, pad_token_id=tokenizer.eos_token_id)
    return tokenizer.decode(outputs[0][tokens["input_ids"].shape[1]:], skip_special_tokens=True)
```

---

## 5. Execution & Verification Commands

```powershell
# 1. Build LoRA package: quarantine ambiguous groups & partition splits
python "Model and Dataset/lora/build_lora_package.py"

# 2. Execute dry-run inspection to verify hashes and manifests
python "Model and Dataset/lora/train_lora.py"

# 3. Calculate analytical parameter and memory metrics
python "Model and Dataset/lora/validate_lora_setup.py" --output "Model and Dataset/reports/lora_validation.json"

# 4. Run automated test suites
python -m unittest discover -s "Model and Dataset/lora" -p "test_*.py"
```
