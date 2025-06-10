# Agentic Programming Language (APL)

> Version: 1.0

APL is a domain-specific language for writing multi‑step, branching LLM workflows (*Agentic Workflows*) in a **Markdown‑flavoured Jinja-syntax**. It gives you program‑level flow control, native tool invocation, and memory without any boilerplate code or third‑party framework.

---

## 0 - Feature Highlights

* **Full Jinja inside every block** — loops, filters, tags, environments. Ship your own extensions (think: *vector database memory* etc.) simply via custom tags and simple Jinja control logic to create the optimal   prompt context.
* **Graph‑like flow control** — set `next_step` in *post* to jump anywhere (cycles allowed); default is fall‑through order.
* **Built‑in state** — flat vars (`result_text`, `runs`, `global_runs`, `time_elapsed`, `error`, …) enable branching, throttling, circuit‑breaking.
* **Provider‑agnostic** — ships with an OpenAI‑style HTTP provider; register any async function in `providers` to work with any local/cloud/API/on-premise  model.
* **Native tool calling** — when the LLM emits a JSON tool‑call, the executor runs your async Python / TS function and returns the result back to the LLM.
* **Cross‑platform** — ships with several reference implementations: Python 3.11+ and TypeScript 5+ / modern JavaScript (Node & browser).
* **Tiny parser & runtime** — APL is driven by simple regexp parsing, a trivial dynamic executor, paired with Jinja template evaluation → LangChain‑class power without the bloat.

---

## 1 - Syntax Specification

Any APL template is a sequence of **steps**. Each step has a `pre`, `prompt`, and optional `post` phase. The `prompt` phase contains the actual prompt messages for the LLM to process, while `pre` and `post` are used for variable setup and control logic (processing the `result_text`, setting variables and deciding what `next_step` to call).

### 1.1 Step Heading

Each **step** comprises up to three **phases** in strict order `pre → prompt → post`. `pre` and `post` are optional; `prompt` is required. A step ends at the first level‑1 heading whose identifier differs.

A phase starts with a level‑1 heading **with `#` at column 0** (no leading spaces):

```
# <phase> : <step-name>
```

* `<phase>` ∈ `{pre, prompt, post}` (case‑insensitive; internal whitespace ignored).
* `<step-name>` (identifier, optional) — any printable chars except line‑breaks, `#`, or `:`. Pre-/ postfix spaces are trimmed.

  * After trimming surrounding whitespace a step identifier must match `^[^\n\r#:]+$`.
  * If the identifier is missing (an empty string), it's identifier defaults to `default`.
  * Identifiers are **case‑sensitive** and **unique within the template** (no other step with the same identifier can exist).
  * Duplicate identifiers in the same template raise an `Duplicate step identifier: <step-name>` validation error at validation time.
* The identifier **`return`** (case‑insensitive) is reserved; user templates may not redeclare it. Doing so raises `Reserved step identifier: return` at validation time.
* Headings cannot contain Jinja expressions, it raises `Invalid step heading: <heading>` at validation time.

### 1.2 Prompt Phase Sub‑sections

Inside a `# prompt:` block the body is divided by level‑2 headings (starting at column 0):

```
## system
<jinja …>
## user
<jinja …>
## assistant
<jinja …>
## developer
<jinja …>
## tool_result
<jinja …>
```

* `<prompt-role>` ∈ `{system, user, assistant, developer, tool_result}` (case‑insensitive; postfix spaces/colons tolerated).
* Duplicate role headings are **concatenated in template order**, separated by a newline. They become distinct messages in the final `prompts` list the executor creates at runtime (for the provider to pass to the LLM for processing).
* Missing roles default to the `user` role.


#### 1.2.1 Inline Attachments

Modern models accept images, files, audio attachments as messages as input. The template author can embed these inline in the template using special directives.

The following directives are detected **after final Jinja rendering** via a line‑scan regex:

```regexp
^@(?P<kind>image_url|audio_input|file)\s+(?P<url>https://\S+)\s*$
```

* Executed on every rendered line; loop‑generated directives are fully supported.
* Must start at column 0 (no leading spaces).
* Ignored inside Jinja comments `{# … #}`.
* Each match appends the URL to the current message’s `image_urls`, `audio_inputs`, or `files` array.

##### Schematics:
```
@image_url     <absolute-URL>
@audio_input   <absolute-URL>   # optional – for audio  recordings
@file          <absolute-URL>   # optional – for PDFs, CSVs, etc.
```

#### 1.2.2 Simple Example

The simplest valid APL template therefore is:

```apl
# prompt: 
How are you?
```

To run the APL template, you can use the `start()` function from the APL runtime API. Here’s how you can run this template in Python:

```python
from defuss_apl import start

agent = """
# prompt: 
How are you?
"""

status = await start(agent)

print(status["result_text"]) 
# "I'm doing well, thank you!"
```

Rules applied:
* Step name identifier defaults to `default`.
* The executor will create a single prompt message with role `user` and content `How are you?` in variable  `prompts`.
* The `pre` and `post` phases are empty, so the executor will call the LLM provider directly and without any pre- or post-processing.
* Therefore, the default model `gpt-4o`, temperature `0.7`, and other variables are used by the default LLM provider (OpenAI) as set in the executor options (see below) and the default endpoint (OpenAI API) is used to start the prompt.

#### 1.2.3 Multimodal example

The following template shows how to use the `image_url` directive to attach an image to the prompt:


```python
from defuss_apl import start

agent = """
# pre: greet me
{% set model = "o4-mini" %}
{% set temperature = 0.1 %}
{% set customer_name = "Aron Homberg" %}

# prompt: greet me

## system:
You are a friendly assistant and a ghibli-style artist.

## user:
Write a greeting for {{ customer_name|upper }} and come up with a beautiful picture for me - influenced by the image attached.
@image_url https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Sunrise.PNG/330px-Sunrise.PNG
"""

status = await start(agent)

print(status["result_text"]) 
# "Good morning ARON HOMBERG! Here's a beautiful picture inspired by the sunrise you attached."

print(status["result_image_urls"][0]) 
# "https://sdmntpritalynorth.oaiusercontent.com/..."
```

### 1.3 Whitespace & Comment Rules

* Heading keyword and colon may carry arbitrary surrounding spaces.
* A phase body ends at the next level‑1 heading (`#` column 0).
* A role body ends at the next level‑2 heading (`##` column 0).
* To show a literal heading inside Markdown, indent it or use a fenced code‑block.
* Use Jinja `{# … #}` or Markdown comments for annotations.

---

## 2 - Executor Semantics

### 2.1 Phase Flow, Default Jump, and implicit return

```
pre → prompt → post →   {
  if next_step set → jump;
  else if more steps → first phase of next step in template order;
  else → implicit return.
}
```

* If `next_step` is explicitly set in the *post* phase, the executor jumps to the step with that identifier.
* If `next_step` is not explicitly set in the *post* phase, the executor jumps to the next natural-order step in template.
* If `next_step` is set to the sentinel `return` (any case), the executor terminates execution and returns the final context.
* If `next_step` is not set and there are no more steps, the executor implicitly returns the final context as a status.
* If `next_step` is set to any non-existing step name, the executor raises `"Unknown step: <step_name>"` at runtime.
* `next_step` is case‑sensitive **except** the sentinel `return` (any case), which terminates execution.

### 2.2 Prompt Success & Retry Logic

A prompt is deemed *successful* if:

1. Provider does not raise an exception.
2. Provider returns a valid response.

A provider is supposed to:

#### 2.2.1 Call the LLM:

Read the `prompts` variable, which is a list of message dicts (see §3). Call the LLM in it's native protocol:

* Generate tool descriptions from the `tools` variable  mapping, filtered by `allowed_tools`, and append them to the `system` and `developer` messages in `prompts`.
* Parse and validate attachment (`@image_url`, `@audio_input`, `@file`) annotations URLs should they appear in any prompt message content. Translate to the native provider format.
* Pass the final pre-processed prompts and hyperparameters to the LLM provider.

#### 2.2.2 Process the LLM response:

Read and validate the response from the LLM provider and call native tools, selected by the LLM:

* Process the response messages from the LLM.
* Parse tool calls from the response and execute them looking up the `tools` variable mapping and calling the respective async functions, interpolating the return value.
* Parse and validate attachment (`@image_url`, `@audio_input`, `@file`) annotations URLs should they appear in the text content of a response message.
* Parse each response message for non-text content (e.g., tool calls, images, audio) and turn them into valid attachment annotations.

#### 2.2.3 Provider Tool Call Format (default)

The LLM *should* emit standard OpenAI tool call objects in JSON format:

```jsonc
{
  "id": "call_1",              // tool call ID, unique per step
  "type": "function",               // still uses "function" here
  "function": {
    "name": "calc",
    "arguments": "{ \"num1\": 40, \"num2\": 2 }"
  }
}
```

However, it is up to the LLM provider to parse the response and extract tool calls. Therefore APL supports any tool call format as long as there is an LLM provider function implementing the parsing logic.

#### 2.2.4 Provider Tool Contract

The LLM provider looks up the async function in `tools` and calls:

Python example:

```python
await tools[name](**arguments, context=context)
```

* `arguments` are expanded as keyword args.
* A **second kwarg** `context` receives the current mutable context dict (providers & tools share the same view).

TypeScript example:

```typescript
await tools[name](arguments, context);
```
* `arguments` is a plain object.
* A **second argument** `context` receives the current mutable context object (providers & tools share the same view).

#### 2.2.5 Tool Return Value

Return value is JSON‑serialisable (`str`, `dict`, …) and returned as a message with role `tool_result`:

```jsonc
{
  "role": "tool_result",
  "content": "<return‑value‑serialised‑as‑str>"
}
```
#### 2.2.6 Result Format

LLM provider functions must return a dict in the following format:

```jsonc
{
  "result_role": "assistant",         // system, user, assistant, developer, tool_result
  "result_text": "...",               // text-based response
  "result_json": {},                  // optional, JSON object, only if `output_mode` is `json` or `structured_output`
  "result_tool_calls": [              // optional, list of tool call objects
    {
      "role": "tool",
      "tool_call_id": "call_1",
      "content": 42,                  // tool call result content
    },
    ...
  ],           
  "result_image_urls": [],            // optional, list of image URLs
  "result_audio_inputs": [],          // optional, list of audio input URLs
  "result_files": []                  // optional, list of file URLs
}
```

Immediately **after** the LLM provider function returns  the executor:

* increments `runs` (for this step) and `global_runs`;
* stores the provider’s return values as variables  `result_text`, `result_json`, `result_tool_calls`, `result_image_urls`, `result_audio_inputs`, and `result_files`;
* evaluates the **post** phase of the step if it exists or jumps to the next step (as per §2.1).

#### 2.2.7 Runtime Error Handling

Failed prompts leave counters unchanged, set `error` with the raised exception text, and skip directly to the step’s *post* phase (if it exists) or jump to the next step (as per §2.1).

### 2.3 Variable Lifecycle

* All phases share one mutable Jinja context.
* `error` is reset to `None` **before** each *prompt* phase (`error` is accessible in **pre** and **post** phases).
* `time_elapsed` and `time_elapsed_global` are monotonic floats in **milliseconds**.
* Executor MAY expose a `max_runs` option (default ∞). Exceeding it raises `"Run budget exceeded"` at runtime.

### 2.4 Executor‑maintained Variables

| Name                  | Type          | When set                | Meaning                          |
| --------------------- | ------------- | ----------------------- | -------------------------------- |
| `prev_step`           | `str \| None` | start of step           | Identifier that just finished    |
| `next_step`           | `str`         | in *post*               | Branch target (`return` ends), only effective in *post*.    |
| `result_text`         | `str`         | after successful prompt | Provider + tool chain output     |
| `result_json`         | `dict \| None` | after successful prompt | JSON object from provider        |
| `result_tool_calls`   | `list`        | after successful prompt | List of tool calls from provider |
| `result_image_urls`   | `list[str]`   | after successful prompt | List of image URLs from provider |
| `result_audio_inputs` | `list[str]`   | after successful prompt | List of audio input URLs from provider |
| `result_files`        | `list[str]`   | after successful prompt | List of file URLs from provider  |
| `runs`                | `int`         | after successful prompt | Count for current step           |
| `global_runs`         | `int`         | after successful prompt | Total successful prompts         |
| `time_elapsed`        | `float` ms    | each phase entry        | Milliseconds since current step began |
| `time_elapsed_global` | `float` ms    | each phase entry        | Milliseconds since workflow start     |
| `error`               | `str \| None` | start to finish of step | Error text from previous step    |
| `prompts`             | `list`        | before provider call    | Chat history in provider schema  |

### 2.5 Allowed / Reserved User Variables

| Variable                                      | Setter           | Default value                                                                                 |
| --------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `model`                     | `str`                   | `"gpt-4o"`               | Default model when none set in *pre*.                                                                 |
| `temperature`               | `float`                 | `0.7`                    | Default temperature.                                                                                  |
| `allowed_tools`             | `list[str]`             | `[]`                     | If non‑empty, only these tools may be invoked.                                                     |
| `output_mode`               | `str`                   |  `"text"`                | Output format: `text`, `json`, or `structured_output` |
| `output_structure`          | `str`                   | None                     | JSON Schema definition for when `output_mode` is `structured_output` |
| `max_tokens`                | `int`                   | `256`                    | Response token cap.                                                                                   |
| `top_p`                     | `float`                 | `0.95`                   | Nucleus sampling cutoff.                                                                              |
| `presence_penalty`          | `float`                 | `0.6`                    | Encourage new topics.                                                                                 |
| `frequency_penalty`         | `float`                 | `-0.4`                   | Discourage repetition.                                                                                |
| `top_k`                     | `int`                   | `40`                     | Top‑k sampling.                                                                                       |
| `repetition_penalty`        | `float`                 | `1.15`                   | HF‑style repetition dampening.                                                                        |
| `stop_sequences`            | `list[str]`             | `[]`                     | Hard‑stop strings.                                                                                    |
| `seed`                      | `int \| null`           | `null`                   | Fixed RNG seed.                                                                                       |
| `logit_bias`                | `dict[str,int]`         | `{}`                     | OpenAI token‑bias map.                                                                                |

---

## 3 - Prompt Message Schema

Right after evaluating the **prompt** as a Jinja template, the executor transforms it into a structured format and stores it in the `prompts` variable. 

The Provider receives the executor `context` as first argument and can access it. 

The format of each message in the `prompts` **list** is:

```jsonc
{
  "role": "system",          // system, user, assistant, developer, tool_result
  "content": "<jinja template rendered text>", // rendered text content
  "image_urls": [            // optional, list of image URLs
    "https://example.com/image1.png"
  ],
  "audio_inputs": [          // optional, list of audio input URLs
    "https://example.com/audio1.mp3"
  ],
  "files": [                 // optional, list of file URLs
    "https://example.com/file1.pdf"
  ]
}
```

---

## 4 - Provider Contract

A provider function is registered via the `providers` option with key equal to the model name.

### 4.1 Python example

```python
from defuss_apl import start

agent = """
# prompt:
Mock a provider function that returns a greeting.
"""

async def provider(context: dict) -> any:
    prompts      = context["prompts"]   # list of message dicts (schema §3)
    model        = context.get("model", "gpt-4o")
    temperature  = context.get("temperature", 0.7)
    # ... other user vars ...
    # Do steps described in §2.2.*  
    # Then return a dict in the following format:
    return {
        "result_role": "assistant",  # role of the result message
        "result_text": "Mocked response",       # text response
        "result_json": {},          # optional, JSON object
        "result_tool_calls": [],    # optional, list of tool call objects
        "result_image_urls": [],    # optional, list of image URLs
        "result_audio_inputs": [],  # optional, list of audio input URLs
        "result_files": []          # optional, list of file URLs
    }

status = await start(agent, options={
    "providers": {"gpt-4o": provider},
})

print(status["result_text"])  # "Mocked response"
```

### 4.2 TypeScript example

```typescript
import { start } from "defuss-apl";
import { Context, ProviderResult } from "defuss-apl";

async function provider(context: Context): Promise<ProviderResult> {
    const prompts = context.prompts; // list of message dicts (schema §3)
    const model = context.model || "gpt-4o";
    const temperature = context.temperature || 0.7;
    // ... other user vars ...
    // Do steps described in §2.2.*
    // Then return a dict in the following format:
    return {
        result_role: "assistant",  // role of the result message
        result_text: "...",       // text response
        result_json: {},          // optional, JSON object
        result_tool_calls: [],    // optional, list of tool call objects
        result_image_urls: [],    // optional, list of image URLs
        result_audio_inputs: [],  // optional, list of audio input URLs
        result_files: []          // optional, list of file URLs
    };
}

const agent = `
# prompt:
Mock a provider function that returns a greeting.
`;
const status = await start(agent, {
    providers: { "gpt-4o": provider },
});
console.log(status.result_text); // "Mocked response"
```

---

## 5 - Native Tool Contract

A tool function is registered via the `tools` option with key equal to the tool name.

### 5.1 Python example

```python
from defuss_apl import start

agent = """
# pre: greet
{% set model = "gpt-4o" %}
{% set temperature = 0.7 %}
{% set allowed_tools = ["calc"] %}

# prompt: greet
## system
You can use the calc tool to add two numbers.
## user
What's the sum of 40 and 2?
"""

async def calc(num1: int, num2: int, context=None):
    """Return the arithmetic sum of two numbers."""
    return num1 + num2

status = await start(agent, options={
    "tools": {"calc": calc}
})

print(status["result_tool_calls"][0]["content"]) # 42
```

### 5.2 TypeScript example

```ts
import { start } from "defuss-apl";
import { Context } from "defuss-apl";

async function calc(num1: number, num2: number, context?: Context) {
  return num1 + num2;
}

const agent = `
# pre: greet
{% set model = "gpt-4o" %}
{% set temperature = 0.7 %}
{% set allowed_tools = ["calc"] %}

# prompt: greet
## system
You can use the calc tool to add two numbers.
## user
What's the sum of 40 and 2?
`
const status = await start(agent, {
  tools: { calc },
});
console.log(status["result_tool_calls"][0]["content"]); // 42
```

---

## 6 - Runtime API

| Function                                        | Purpose |                                                 
| ----------------------------------------------- | ------- | 
| `check(apl: str) -> bool` | Returns `True` on success or raises `ValidationError` with location‑specific details.                   |
| `start(apl: str, options: dict = {}) -> dict` | Validate then run template(s); returns the **final mutable context** (all variables) after termination. |


### 6.1 `start()` Options

The `start()` function accepts an optional `options` dict to configure the executor.

| Option                      | Type                    | Default                  | Description                                                                                           |
| --------------------------- | ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `timeout`                   | `int`                   | `30000` (ms)             | Wall‑clock timeout for entire run; `RuntimeError` on expiry.                                          |
| `providers`                 | `dict[str, async func]` | `{}`                     | Model‑name → provider function (`context` dict) mapping.                                              |
| `base_url`                  | `str`                   | `https://api.openai.com` | Base URL for the default HTTP provider.                                                               |
| `api_key`                   | `str`                   | `"<API_KEY>"`            | Secret for default provider.                                                                          |
| `tools`                     | `dict[str, async func]` | `{}`                     | Tool‑name → async function mapping (signature §4.2).                                                  |
| `variables`                 | `dict[str, any]`        | `{}`                     | Top‑level variables injected into **every** step.                                                     |
| `debug`                     | `bool`                  | `false`                  | Emit verbose logs to stderr.                                                                          |
| `max_runs`                  | `int \| null`           | `null` (∞)               | Hard cap for `global_runs`.                                                                           |
| `jinja2_env`                | `jinja2.Environment`    | *auto*                   | Custom sandboxed env shared across steps (read‑only in templates).                                    |


### 6.2 Custom Jinja2 Environment Example

You can pass a custom Jinja2 environment to the executor, allowing you to customize the Jinja2 rendering behavior, such as adding custom filters or globals.

```python 
from defuss_apl import start
from jinja2 import Environment, FileSystemLoader

def greet(name):
    return f"Hello, {name}!"

def shout(s):
    return s.upper() + "!!!"

env = Environment()

# Register as global function
env.globals['greet'] = greet

# Register as filter
env.filters['shout'] = shout

# Register the custom Jinja2 environment with the executor
options = {
    "jinja2_env": env,
    "variables": {
        "customer_name": "Alice"
    }
}

# Execute the APL template with the custom Jinja2 environment
status = start(open("agent.apl").read(), options=options)
print(status)
```

```typescript
import { start } from 'defuss-apl';
import { readFileSync } from 'node:fs';
import { Environment, FileSystemLoader } from 'defuss-jinja2';

async function greet(name: string): Promise<string> {
    return `Hello, ${name}!`;
}
async function shout(s: string): Promise<string> {
    return `${s.toUpperCase()}!!!`;
}
const env = new Environment({
    loader: new FileSystemLoader('path/to/templates'),
});

// Register as global function
env.globals['greet'] = greet;

// Register as filter
env.filters['shout'] = shout;

// Register the custom Jinja2 environment with the executor
const options = {
    jinja2_env: env,
    variables: {
        customer_name: 'Alice'
    }
};

// Execute the APL template with the custom Jinja2 environment
const status = await start(readFileSync("agent.apl", "utf-8"), options);
console.log(status);
```