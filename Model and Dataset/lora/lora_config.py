"""Load and validate the repository's LoRA configuration without training.

==============================================================================
LORA CONFIGURATION LOADER & VALIDATOR (lora_config.py)
==============================================================================
Role:
  Parses, verifies, and enforces structural constraints on the PEFT/LoRA
  hyperparameters defined in `lora_config.json`. Guarantees zero training
  occurs while verifying architectural readiness.

------------------------------------------------------------------------------
MINDMAP FLOW: LORA CONFIGURATION VALIDATION
------------------------------------------------------------------------------
[lora_config.json]
       │
       ├── 1. JSON Parsing & Default Extraction (base_model, r, lora_alpha, dropout)
       ├── 2. Structural Type Invariants:
       │     ├── base_model != empty
       │     ├── task_type == "CAUSAL_LM"
       │     ├── rank (r) > 0
       │     ├── lora_alpha >= r
       │     ├── 0 <= lora_dropout < 1.0
       │     ├── target_modules is not empty (e.g. ("c_attn",))
       │     └── max_sequence_length >= 64
       └── 3. Safety Guard Enforcement:
             └── training_enabled MUST BE False (blocks unverified GPU runs)

------------------------------------------------------------------------------
ASCII FLOW: CONFIGURATION AUDIT
------------------------------------------------------------------------------
 lora_config.json ──► load_lora_config() ──► LoraSettings Dataclass
                              │
                              ▼ validate_lora_config()
             ┌───────────────────────────────────────────────┐
             │ Checks:                                       │
             │ [x] Task is CAUSAL_LM                         │
             │ [x] Rank > 0 (r=8)                            │
             │ [x] Alpha >= Rank (alpha=32)                  │
             │ [x] Dropout in [0, 1) (0.05)                  │
             │ [x] target_modules == ("c_attn",)             │
             │ [x] training_enabled == False (Safety Locked) │
             └───────────────────────────────────────────────┘
                              │
                    Returns (settings, raw_json)
==============================================================================
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class LoraSettings:
    """Immutable representation of validated LoRA hyperparameters."""
    base_model: str
    task_type: str
    rank: int
    alpha: int
    dropout: float
    target_modules: tuple[str, ...]
    max_sequence_length: int
    training_enabled: bool


def load_lora_config(path: Path | None = None) -> tuple[LoraSettings, dict[str, Any]]:
    """Load JSON file from disk, parse settings, and validate constraints.

    Mindmap Flow:
    ```
    [load_lora_config]
           │
           ├── 1. Resolve Path (default: lora_config.json)
           ├── 2. Parse JSON & Extract Sub-dictionaries
           ├── 3. Construct LoraSettings Dataclass
           └── 4. Execute validate_lora_config()
    ```

    Returns:
        tuple[LoraSettings, dict[str, Any]]: Validated dataclass and raw dict.
    """
    config_path = path or Path(__file__).with_name("lora_config.json")
    raw = json.loads(config_path.read_text(encoding="utf-8"))
    dataset = raw.get("dataset", {})
    safety = raw.get("safety", {})
    settings = LoraSettings(
        base_model=str(raw.get("base_model", "")).strip(),
        task_type=str(raw.get("task_type", "")).strip(),
        rank=int(raw.get("r", 0)),
        alpha=int(raw.get("lora_alpha", 0)),
        dropout=float(raw.get("lora_dropout", -1)),
        target_modules=tuple(raw.get("target_modules", [])),
        max_sequence_length=int(dataset.get("max_sequence_length", 0)),
        training_enabled=bool(safety.get("training_enabled", True)),
    )
    validate_lora_config(settings)
    return settings, raw


def validate_lora_config(settings: LoraSettings) -> None:
    """Assert all mathematical and safety invariants on LoRA hyperparameters.

    Raises:
        ValueError: If any invariant fails or training_enabled is True.
    """
    errors: list[str] = []
    if not settings.base_model:
        errors.append("base_model must be set")
    if settings.task_type != "CAUSAL_LM":
        errors.append("task_type must be CAUSAL_LM")
    if settings.rank <= 0:
        errors.append("r must be greater than zero")
    if settings.alpha < settings.rank:
        errors.append("lora_alpha must be at least r")
    if not 0 <= settings.dropout < 1:
        errors.append("lora_dropout must be in the range [0, 1)")
    if not settings.target_modules:
        errors.append("target_modules must not be empty")
    if settings.max_sequence_length < 64:
        errors.append("max_sequence_length must be at least 64")
    if settings.training_enabled:
        errors.append("training_enabled must remain false in this no-training package")
    if errors:
        raise ValueError("Invalid LoRA configuration: " + "; ".join(errors))
