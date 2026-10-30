"""Dry-run a LoRA job by default. Training requires explicit opt-in and reviewed data."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
from lora_config import load_lora_config

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
    return {"base_model": settings.base_model, "rank": settings.rank, "alpha": settings.alpha, "target_modules": list(settings.target_modules), "counts": counts, "data_source_sha256": manifest["source_sha256"], "clinical_review_approved": manifest.get("clinical_review_approved") is True, "license_review_approved": manifest.get("license_review_approved") is True, "reviewer": manifest.get("reviewer"), "training_performed": False, "config": raw}

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).resolve().parents[1] / "prepared")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).parent / "adapter-output")
    parser.add_argument("--train", action="store_true", help="Explicitly allow model download and training after review")
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--quantization", choices=("none", "4bit"), default="none", help="Optional QLoRA: load the base model in 4-bit on a supported CUDA system")
    args = parser.parse_args()
    report = inspect_job(args.data_dir)
    if not args.train:
        print(json.dumps(report, indent=2))
        return
    if not report["clinical_review_approved"] or not report["license_review_approved"] or not report["reviewer"]:
        raise SystemExit("Training blocked: the exact hashed dataset requires documented clinical/license review and a named reviewer.")
    if not 0 < args.epochs <= 10:
        raise SystemExit("Use an epoch count greater than zero and at most 10.")
    # Optional heavy dependencies are imported only after all opt-in/review checks.
    import torch
    from datasets import load_dataset
    from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, DataCollatorForSeq2Seq, Trainer, TrainingArguments, set_seed
    set_seed(42)
    settings, raw = load_lora_config()
    tokenizer = AutoTokenizer.from_pretrained(settings.base_model)
    tokenizer.pad_token = tokenizer.eos_token
    model_options = {}
    if args.quantization == "4bit":
        if not torch.cuda.is_available():
            raise SystemExit("4-bit QLoRA requires a supported CUDA device and bitsandbytes installation.")
        from transformers import BitsAndBytesConfig
        compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        model_options = {"quantization_config": BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=compute_dtype), "device_map": {"": torch.cuda.current_device()}}
    model = AutoModelForCausalLM.from_pretrained(settings.base_model, **model_options)
    if args.quantization == "4bit": model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, LoraConfig(r=settings.rank, lora_alpha=settings.alpha, lora_dropout=settings.dropout, bias="none", task_type=TaskType.CAUSAL_LM, target_modules=list(settings.target_modules), fan_in_fan_out=settings.base_model == "gpt2"))
    dataset = load_dataset("json", data_files={name: str(args.data_dir / (name + ".jsonl")) for name in ("train", "validation")})
    def tokenize(row):
        prefix = "Question: " + row["question"] + "\nAnswer: "
        tokens = tokenizer(prefix + row["answer"] + tokenizer.eos_token, max_length=settings.max_sequence_length, truncation=True)
        prompt_length = len(tokenizer(prefix, add_special_tokens=False)["input_ids"])
        tokens["labels"] = [-100] * min(prompt_length, len(tokens["input_ids"])) + tokens["input_ids"][prompt_length:]
        return tokens
    dataset = dataset.map(tokenize, remove_columns=dataset["train"].column_names)
    dataset = dataset.filter(lambda row: any(value != -100 for value in row["labels"]))
    if not len(dataset["train"]) or not len(dataset["validation"]):
        raise SystemExit("No trainable records remain after tokenization.")
    trainer = Trainer(model=model, args=TrainingArguments(output_dir=str(args.output_dir), num_train_epochs=args.epochs, per_device_train_batch_size=1, per_device_eval_batch_size=1, gradient_accumulation_steps=8, learning_rate=2e-4, eval_strategy="epoch", save_strategy="epoch", logging_steps=20, fp16=torch.cuda.is_available(), report_to="none", seed=42), train_dataset=dataset["train"], eval_dataset=dataset["validation"], data_collator=DataCollatorForSeq2Seq(tokenizer, model=model, label_pad_token_id=-100))
    trainer.train()
    model.save_pretrained(args.output_dir); tokenizer.save_pretrained(args.output_dir)
    report.pop("config"); report["training_performed"] = True; report["quantization"] = args.quantization
    (args.output_dir / "training_manifest.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(trainer.evaluate(), indent=2))

if __name__ == "__main__":
    main()
