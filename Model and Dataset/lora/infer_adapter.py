"""Run an explicitly supplied local adapter. Never used by the web server."""
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--adapter", type=Path, required=True)
    parser.add_argument("--prompt", required=True)
    args = parser.parse_args()
    if not (args.adapter / "adapter_config.json").is_file():
        raise SystemExit("A trained local adapter_config.json is required.")
    from peft import AutoPeftModelForCausalLM
    from transformers import AutoTokenizer
    model = AutoPeftModelForCausalLM.from_pretrained(args.adapter)
    tokenizer = AutoTokenizer.from_pretrained(args.adapter)
    tokens = tokenizer("Question: " + args.prompt + "\nAnswer: ", return_tensors="pt")
    outputs = model.generate(**tokens, max_new_tokens=150, do_sample=False, pad_token_id=tokenizer.eos_token_id)
    print(tokenizer.decode(outputs[0][tokens["input_ids"].shape[1]:], skip_special_tokens=True))
    print("\nExperimental adapter output; not clinically validated.")

if __name__ == "__main__":
    main()
