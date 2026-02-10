import os, re
from git import Repo
import re
from pathlib import Path

git_url="https://github.com/kyr0/defuss.git"
clone_to_path="./training-repo"
files_for_training_regex=r"examples/.*\.(ts|tsx)$"

repo_id = "kyr0/qwen3-coder-defuss-30B-A3B-fim-lora-v1"
local_dir = "qwen3-coder-defuss-30B-A3B-fim-lora-v1"
hf_token = os.environ.get("HF_TOKEN")

max_seq_length = 2048 # Choose any! We auto support RoPE Scaling internally!
dtype = None # None for auto detection. Float16 for Tesla T4, V100, Bfloat16 for Ampere+
load_in_4bit = True # Use 4bit quantization to reduce memory usage. Can be False.
model_name = "unsloth/Qwen3-Coder-30B-A3B-Instruct" # bad idea in general, but let's try!

FIM_PREFIX = "<|fim_prefix|>"
FIM_SUFFIX = "<|fim_suffix|>"
FIM_MIDDLE = "<|fim_middle|>"

if hf_token is None:
    raise RuntimeError("HF_TOKEN environment variable is not set")

try:
  Repo.clone_from(git_url, clone_to_path)
except:
  print("Repo already cloned")

# The regex should match the path relative to clone_to_path
complete_regex = re.compile(files_for_training_regex)
print(f'About to find files matching {complete_regex}')

files_for_training = [p for p in Path(clone_to_path).rglob("*") if p.is_file() and complete_regex.match(str(p.relative_to(clone_to_path)))]

files_for_training[-5:]

### Unsloth

from unsloth import FastLanguageModel
import torch

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = model_name,
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

model = FastLanguageModel.get_peft_model(
    model,
    r = 16, # (Rank) Choose any number > 0 ! Suggested 8, 16, 32, 64, 128
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj",],
    lora_alpha = 16,
    lora_dropout = 0, # Supports any, but = 0 is optimized
    bias = "none",    # Supports any, but = "none" is optimized
    # [NEW] "unsloth" uses 30% less VRAM, fits 2x larger batch sizes!
    use_gradient_checkpointing = "unsloth", # True or "unsloth" for very long context
    random_state = 3407,
    use_rslora = False,  # We support rank stabilized LoRA
    loftq_config = None, # And LoftQ
)

### Data Prep

import json, random
from datasets import load_dataset



def make_fim_examples_from_file(text: str, n_examples: int = 20):
    """
    Very simple: pick random cursor positions, cut out a middle span,
    and keep some suffix for true FIM.
    """
    examples = []
    if len(text) < 800:
        return examples

    for _ in range(n_examples):
        # pick a random cursor away from edges
        cut = random.randint(200, len(text) - 200)

        # choose windows (chars). Keeps examples small and autocomplete-like.
        prefix_start = max(0, cut - random.randint(800, 2500))
        prefix_end = cut

        middle_len = random.randint(80, 500)  # chars of code to fill
        middle_start = cut
        middle_end = min(len(text), cut + middle_len)

        suffix_start = middle_end
        suffix_end = min(len(text), suffix_start + random.randint(200, 1200))

        prefix = text[prefix_start:prefix_end]
        middle = text[middle_start:middle_end]
        suffix = text[suffix_start:suffix_end]

        # skip junk middles
        if len(middle.strip()) < 10:
            continue

        # Qwen FIM format
        examples.append({
            "text": f"{FIM_PREFIX}{prefix}{FIM_SUFFIX}{suffix}{FIM_MIDDLE}{middle}"
        })

    return examples

# ---- usage: files_for_training is your list of file paths ----
random.seed(42)

with open("train.jsonl", "w", encoding="utf-8") as out:
    for path in files_for_training:
        try:
            text = open(path, "r", encoding="utf-8").read()
        except UnicodeDecodeError:
            text = open(path, "r", encoding="utf-8", errors="ignore").read()

        for ex in make_fim_examples_from_file(text, n_examples=20):
            out.write(json.dumps(ex, ensure_ascii=False) + "\n")

print("Wrote train.jsonl")

# Your jsonl lines look like: {"text": "...fim..."}
ds = load_dataset("json", data_files="train.jsonl")["train"]

# Create splits automatically
splits = ds.train_test_split(test_size=0.05, seed=42)  # 1% validation

train_dataset = splits["train"].shuffle(seed=42)
eval_dataset  = splits["test"]

print(train_dataset[0]["text"][:300])

"""Let's first see before we do any finetuning what the model outputs for the first example!"""

from unsloth import FastLanguageModel
import torch

sample = train_dataset[0]["text"]

prefix_and_rest = sample[len(FIM_PREFIX):]
prefix, rest = prefix_and_rest.split(FIM_SUFFIX, 1)
suffix, gold_middle = rest.split(FIM_MIDDLE, 1)

# print(f"Prefix: {prefix}")
# print(f"Suffix: {suffix}")
# print(f"Gold middle: {gold_middle}")

prompt = f"{FIM_PREFIX}{prefix}{FIM_SUFFIX}{suffix}{FIM_MIDDLE}"

print(f"prompt: {prompt}")

FastLanguageModel.for_inference(model)

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

print(f"completion: {completion}")
print(f"What we were actually looking for: {gold_middle}")

### Train the model

from trl import SFTConfig, SFTTrainer
from transformers import DataCollatorForLanguageModeling

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = train_dataset,
    eval_dataset = eval_dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    data_collator = DataCollatorForLanguageModeling(tokenizer = tokenizer, mlm = False),
    packing = True, # Best for FIM snippets & can make training 5x faster for short sequences.

    args = SFTConfig(
        per_device_train_batch_size = 64, # H200 -> 4
        gradient_accumulation_steps = 8, # 8 better than 4 for small data

        num_train_epochs = 1,
        warmup_steps = 5,
        learning_rate=1e-4, # safer than 2e-4 on small datasets
        lr_scheduler_type="linear",
        logging_steps=10,

        optim = "paged_adamw_8bit", # Save more memory
        weight_decay = 0.01,

        seed = 3407,
        output_dir = "outputs",
        report_to = "none", # Use TrackIO/WandB etc

        # Quality-of-life / stability
        fp16 = False,              # H200

        bf16 = True,           # (don’t use on T4)
        eval_steps = 50,
        save_steps = 50,
        save_total_limit = 2,
    ),
)

# @title Show current memory stats
gpu_stats = torch.cuda.get_device_properties(0)
start_gpu_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 3)
max_memory = round(gpu_stats.total_memory / 1024 / 1024 / 1024, 3)
print(f"GPU = {gpu_stats.name}. Max memory = {max_memory} GB.")
print(f"{start_gpu_memory} GB of memory reserved.")

trainer_stats = trainer.train()

# @title Show final memory and time stats
used_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 3)
used_memory_for_lora = round(used_memory - start_gpu_memory, 3)
used_percentage = round(used_memory / max_memory * 100, 3)
lora_percentage = round(used_memory_for_lora / max_memory * 100, 3)
print(f"{trainer_stats.metrics['train_runtime']} seconds used for training.")
print(
    f"{round(trainer_stats.metrics['train_runtime']/60, 2)} minutes used for training."
)
print(f"Peak reserved memory = {used_memory} GB.")
print(f"Peak reserved memory for training = {used_memory_for_lora} GB.")
print(f"Peak reserved memory % of max memory = {used_percentage} %.")
print(f"Peak reserved memory for training % of max memory = {lora_percentage} %.")
