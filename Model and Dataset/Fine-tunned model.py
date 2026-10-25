"""Compatibility entry point for the retired Colab fine-tuning export.

The original notebook export mixed Python, shell commands, an embedded image,
and credentials-oriented upload steps. It was not safe or valid as a normal
Python module. The maintained, no-training LoRA preparation tools now live in
``Model and Dataset/lora``.

This file intentionally does not download a model, train, or upload artifacts.
"""

from pathlib import Path


def main() -> None:
    lora_readme = Path(__file__).with_name("lora") / "README.md"
    print("The legacy training export has been retired.")
    print(f"Use the validated no-training LoRA preparation workflow: {lora_readme}")


if __name__ == "__main__":
    main()
