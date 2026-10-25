# No-training LoRA preparation

This directory contains a validated LoRA configuration and dataset conversion tools. It deliberately does **not** download a foundation model, allocate a GPU, start training, or publish an adapter.

The default configuration preserves the historical GPT-2 experiment (`r=8`, `alpha=32`, target `c_attn`) while making the safety boundary explicit. Medical correctness still requires licensing checks, clinician review, held-out evaluation, and an approved model-release process.

## Validate the configuration

```powershell
cd "Model and Dataset/lora"
python validate_lora_setup.py --output ../reports/lora_validation.json
python -m unittest test_lora_tools.py
```

## Prepare SFT records without training

Run `prepare_dataset.py` first, then convert a prepared split:

```powershell
python prepare_sft_records.py ../prepared/train.csv ../prepared/train.jsonl
```

The JSONL records contain `text`, `question`, and `answer`. Source hashes and row counts are returned for reproducibility. Generated model weights are intentionally not included in this repository.
