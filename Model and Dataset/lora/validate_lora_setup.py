"""Validate the LoRA scaffold and estimate adapter size without loading a model.

==============================================================================
LORA SCAFFOLD VALIDATOR & PARAMETER ESTIMATOR (validate_lora_setup.py)
==============================================================================
Role:
  Performs analytical validation of LoRA configurations and computes parameter
  footprints without requiring GPU resources, Hugging Face downloads, or training.

Mathematical Formulation:
  For a transformer with L layers, P target projections per layer, hidden size H,
  and adapter rank R, each low-rank update decomposes into:
      Delta W = B * A, where B in R^{H x R} and A in R^{R x H}
  Total trainable parameters:
      P_total = L * P * 2 * H * R
  FP16 memory footprint:
      M_FP16 = (P_total * 2 bytes) / (1024 * 1024) MB

------------------------------------------------------------------------------
MINDMAP FLOW: ANALYTICAL LORA VALIDATION
------------------------------------------------------------------------------
[validate_lora_setup.py]
       │
       ├── 1. Load & Validate Configuration (load_lora_config)
       ├── 2. Extract Architectural Assumptions (hidden_size, layers, target_modules, r)
       ├── 3. Closed-Form Parameter Calculation (estimate_adapter_parameters)
       ├── 4. Memory Footprint Derivation (FP16 megabytes)
       └── 5. Audit Report Assembly & Output (lora_validation.json)

------------------------------------------------------------------------------
ASCII FLOW: CLOSED-FORM PARAMETER ESTIMATION
------------------------------------------------------------------------------
  Architecture: GPT-2 (H=768, L=12, P=1 ("c_attn"), R=8)
        │
        ▼ Parameter Formula
  12 * 1 * 2 * 768 * 8 = 147,456 Trainable Parameters
        │
        ▼ FP16 Byte Footprint
  147,456 * 2 / 1,048,576 = 0.281 MB (Adapter Disk / RAM Size)
==============================================================================
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from lora_config import load_lora_config


def estimate_adapter_parameters(hidden_size: int, layers: int, projections_per_layer: int, rank: int) -> int:
    """Calculate the exact number of trainable parameters in the LoRA matrices.

    Args:
        hidden_size: Transformer embedding / hidden dimension H.
        layers: Total transformer blocks L.
        projections_per_layer: Count of targeted linear projection heads P.
        rank: Low-rank dimension R.

    Returns:
        int: Trainable parameter count.
    """
    if min(hidden_size, layers, projections_per_layer, rank) <= 0:
        raise ValueError("All estimator inputs must be greater than zero")
    return layers * projections_per_layer * 2 * hidden_size * rank


def build_report(config_path: Path | None, hidden_size: int, layers: int) -> dict[str, object]:
    """Assemble a comprehensive analytical report of the LoRA configuration.

    Args:
        config_path: Path to lora_config.json or None.
        hidden_size: Assumed model hidden dimension.
        layers: Assumed layer count.

    Returns:
        dict[str, object]: Detailed validation and parameter footprint metrics.
    """
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=None)
    parser.add_argument("--hidden-size", type=int, default=768)
    parser.add_argument("--layers", type=int, default=12)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()
    report = build_report(args.config, args.hidden_size, args.layers)
    rendered = json.dumps(report, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
