import torch
from unsloth import FastLanguageModel
from datasets import load_dataset
import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# --- Configuration ---
repo_id = "kyr0/qwen3-coder-defuss-30B-A3B-fim-lora-v1"
local_dir = "./outputs/checkpoint-5" # Path to your trained LoRA adapters
base_model_name = "unsloth/Qwen3-Coder-30B-A3B-Instruct" # Explicitly define base model
hf_token = os.environ.get("HF_TOKEN")

FIM_PREFIX = "<|fim_prefix|>"
FIM_SUFFIX = "<|fim_suffix|>"
FIM_MIDDLE = "<|fim_middle|>"

if hf_token is None:
    raise RuntimeError("HF_TOKEN environment variable is not set")

print(f"Using HF_TOKEN starting with: {hf_token[:4]}...")

if not os.path.exists(local_dir):
     raise RuntimeError(f"Local directory {local_dir} does not exist. Check your training complete logic.")

print(f"Loading model from {local_dir}...")

# Use FastLanguageModel to load the model + LoRA
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = local_dir, # Load from local checkpoint
    max_seq_length = 2048,
    dtype = None,
    load_in_4bit = True,
)

# Enable for inference
FastLanguageModel.for_inference(model)

print("Model loaded successfully.")

# --- Inference Verification ---
print("\n--- Running Inference Verification ---")

# Load one example from train.jsonl to verification
try:
    ds = load_dataset("json", data_files="train.jsonl")["train"]
    sample = ds[0]["text"]
    
    # Extract prediction targets (same logic as train.py)
    prefix_and_rest = sample[len(FIM_PREFIX):]
    prefix, rest = prefix_and_rest.split(FIM_SUFFIX, 1)
    suffix, gold_middle = rest.split(FIM_MIDDLE, 1)
    
    prompt = f"{FIM_PREFIX}{prefix}{FIM_SUFFIX}{suffix}{FIM_MIDDLE}"
    
    print(f"Prompt (truncated): {prompt[:100]}...")
    
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=128,
            do_sample=False,
            temperature=0.0,
            pad_token_id=tokenizer.eos_token_id,
            use_cache=True,
        )

    decoded = tokenizer.decode(outputs[0], skip_special_tokens=False)
    completion = decoded[len(prompt):]

    print(f"\nCompletion: {completion}")
    print(f"Gold Middle: {gold_middle}")

except Exception as e:
    print(f"\nWarning: Could not run verification inference: {e}")
    print("Proceeding with upload with CAUTION...")

# --- Upload to Hugging Face ---
print(f"\n--- Uploading to Hugging Face Hub: {repo_id} ---")

# Ensure we're using the right token
try:
    model.push_to_hub(repo_id, token=hf_token)
    tokenizer.push_to_hub(repo_id, token=hf_token)
    print("LoRA adapters uploaded successfully.")
except Exception as e:
    print(f"Error uploading LoRA adapters: {e}")
    # Continue to GGUF even if LoRA fails? No, probably not. But let's try.

# Saving/Uploading GGUF
print("\n--- Converting and Uploading GGUF ---")
try:
    model.push_to_hub_gguf(
        "kyr0/qwen3-coder-defuss-30B-A3B-fim-gguf",
        tokenizer,
        quantization_method=["q4_k_m", "q5_k_m", "q8_0"],
        token=hf_token,
    )
    print("GGUF uploaded successfully.")
except Exception as e:
    print(f"Error during GGUF upload: {e}")