# Agentic Prompting Language (APL)

> Version: 1.0

APL is a Turing-complete, domain-specific language for writing multi‑step, branching LLM workflows (*Agentic Workflows*) in a **Markdown‑flavoured Jinja-syntax**. It gives you program‑level flow control, native tool invocation, and memory without any boilerplate code or third‑party framework. Run any agent on the server, or even in-browser. Python or TypeScript/JavaScript, locally or in the cloud, on-premise, on the edge and with any LLM provider and model.

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

The following directives are detected **after final Jinja rendering** by the executor via a line‑scan regex:

```regexp
^@(?P<kind>image_url|audio_input|file)\s+(?P<url>https://\S+)\s*$
```

* Executed by the executor on every rendered line; loop‑generated directives are fully supported.
* Must start at column 0 (no leading spaces).
* Ignored inside Jinja comments `{# … #}`.
* Each match is parsed by the executor and converted to OpenAI-standard message format before the provider is called.

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

## 2 - Executor Semantics

### 2.1 Phase Flow, Default Jump, and implicit return

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
* **Circular References**: Circular `next_step` references are allowed. The template author is responsible for implementing circuit-breaking logic. Without proper circuit-breaking, the default timeout (120 seconds) will raise a timeout error at runtime.

### 2.2 Prompt Success & Retry Logic

A prompt is deemed *successful* if:

1. Provider does not raise an exception.
2. Provider returns a valid response.

A provider is supposed to:

#### 2.2.1 Call the LLM:

Read the `prompts` variable, which is a list of message dicts in OpenAI-standard format (see §3). Call the LLM in its native protocol:

* Use `describeTools(context)` to generate tool descriptions from the `with_tools` variable mapping, filtered by `allowed_tools`, and store in the `tools` context variable. This can be passed directly as a hyperparameter to the LLM provider.
* The `prompts` variable is already pre-processed by the executor with all attachments converted to OpenAI-standard format. Providers can use this directly or transform it to their native format as needed.
* Pass the final prompts and hyperparameters to the LLM provider.

#### 2.2.2 Process the LLM response:

Read and validate the response from the LLM provider and call native tools, selected by the LLM:

* Process the response messages from the LLM.
* **Tool Call Execution**: If the LLM response contains tool calls, they are executed immediately using `callTools(context)`. The executor looks up functions in the `with_tools` variable mapping and calls the respective async functions. Tool calls are processed in the order they appear in the LLM response.
* **Tool Call Results**: The results of all tool executions are automatically stored in the `result_tool_calls` context variable as a list of tool call result objects.
* Return the response in OpenAI-standard format for the executor to process.

#### 2.2.3 Standard Tool Calling

In case the LLM supports standard OpenAI tool calling (see §5), the LLM provider can use the standard runtime functions `describeTools(context)` and `callTools(context)` to handle tool calling. 

#### 2.2.4 Custom Tool Calling

In case the LLM does not support standard OpenAI tool calling, the LLM provider looks up the tool configuration in `with_tools`, and generates a OpenAI specification conform tool description for each tool that is allowed by `allowed_tools`. The resulting list of tool descriptions MUST be stored in the `tools` context variable.

Example of a valid `tool_description`:

```jsonc
{
  "name": "calc",
  "description": "A simple calculator",
  "parameters": {
    "num1": {
      "type": "integer",
      "description": "The first number"
    },
    "num2": {
      "type": "integer",
      "description": "The second number"
    }
  }
}
```

Tool descriptions are transmitted to the LLM provider as per the LLM providers defined protocol or prompt template format.

When the LLM responds with custom tool calls, the provider function must parse the tool call messages, transform them into OpenAI format and execute each using the `callTool(tool_call)` runtime function. 

Example of a valid `tool_call`:

```jsonc
{
  "id": "call_1",              // tool call ID, unique per step
  "type": "function",          // still uses "function" here
  "function": {
    "name": "calc",
    "arguments": "{ \"num1\": 40, \"num2\": 2 }"
  }
}
```

#### 2.2.5 Provider Result

LLM provider functions must return a response in OpenAI-standard format. The executor will then parse this response and extract the relevant information into APL result variables.

Example of a valid provider response:
```jsonc
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking.",
        "tool_calls": [  // optional, if LLM made tool calls
          {
            "id": "call_1",
            "type": "function", 
            "function": {
              "name": "calc",
              "arguments": "{\"num1\": 40, \"num2\": 2}"
            }
          }
        ]
      }
    }
  ],
  "usage": {  // optional
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

#### 2.2.6 Executor Post-Processing for Provider Functions

The executor automatically parses the provider response and sets the following context variables:

```jsonc
{
  "result_role": "assistant",         // extracted from message.role
  "result_text": "Hello! I'm doing well, thank you for asking.",  // extracted from message.content (text parts only)
  "result_json": {},                  // optional, JSON object, only if `output_mode` is `json` or `structured_output`
  "result_tool_calls": [              // processed tool call results
    {
      "role": "tool",                 
      "tool_call_id": "call_1",       // mapping to the tool call ID
      "content": 42,                  // actual tool execution result
    }
  ],           
  "result_image_urls": [],            // extracted from message.content (image_url parts)
  "result_audio_inputs": [],          // extracted from message.content (audio_input parts)
  "result_files": []                  // extracted from message.content (file parts)
}
```

The executor automatically continues to:
1. Extracts text content from `message.content` (string or text parts of array)
2. Parse and store any `image_url`, `audio_input`, or `file` content parts in their respective result arrays
3. Execute any tool calls and stores results in `result_tool_calls`
4. Set the `prompt_tokens`, `completion_tokens`, and `total_tokens` in the `usage` variable if present in the provider response.
5. Validate structured JSON output when `output_mode` is set appropriately and `output_structure` is defined.
6. Set the `result_role` to the role of the primary return message (e.g., `assistant`), excluding tool call roles.
7. Set the `result_json` variable if the provider response contains a valid JSON object and `output_mode` is set to `json` or `structured_output`.
8. Increment the `runs` counter for the current step and `global_runs` for the entire workflow
9. Set the `error` variable if an error occurred during the provider call or any tool call.
10. Proceed to evaluate the *post* phase of the step, where the `next_step` can be set.

### 2.3 Variable Lifecycle

All phases share one mutable Jinja context.

* `error` is reset to `None` **before** each *prompt* phase. Therefore, `error` is accessible in **pre** and **post** phases.
* `time_elapsed` and `time_elapsed_global` are monotonic floats in **milliseconds**.
* Executor MAY expose a `max_runs` option (default ∞). Exceeding it raises `"Run budget exceeded"` at runtime.

### 2.4 Executor‑maintained Variables

Variables in the executor context are shared between the Jinja templates, provider functions, and tool functions (when `with_context` is enabled for `with_tools`). The executor automatically maintains these variables:

| Name                  | Type          | When set                | Meaning                          |
| --------------------- | ------------- | ----------------------- | -------------------------------- |
| `prev_step`           | `str \| None` | start of step           | Identifier that just finished    |
| `next_step`           | `str`         | in *post*               | Branch target (`return` ends), only effective in *post*.    |
| `result_text`         | `str`         | after successful provider call     | Provider + tool chain output     |
| `result_json`         | `dict \| None` | after successful provider call     | JSON object from provider        |
| `result_tool_calls`   | `list`        | after successful provider call     | List of executed tool call results |
| `result_image_urls`   | `list[str]`   | after successful provider call     | List of image URLs from provider |
| `result_audio_inputs` | `list[str]`   | after successful provider call     | List of audio input URLs from provider |
| `result_files`        | `list[str]`   | after successful provider call     | List of file URLs from provider  |
| `result_role`         | `str`         | after successful provider call     | Role of the result message       |
| `usage`               | `dict \| None` | after successful provider call     | Token usage stats from provider response    |
| `runs`                | `int`         | after successful provider call     | Count for current step           |
| `global_runs`         | `int`         | after successful provider call     | Total successful prompts         |
| `time_elapsed`        | `float` ms    | each phase entry        | Milliseconds since current step began |
| `time_elapsed_global` | `float` ms    | each phase entry        | Milliseconds since workflow start     |
| `error`               | `str \| None` | start to finish of step | Error text from previous step      |
| `prompts`             | `list`        | before provider call    | Chat history in provider schema  |
| `tools`               | `list`        | after `describeTools()` or custom tool definitions | List of tool descriptions for LLM provider in OpenAI format |
| `context`             | `dict`        | updated after every phase of every step    | Holds the union of executor-maintained variables (§2.4) and all user-settable variables (§2.5) and options (§6.1) |
| `context_history`     | `list`        | updated after each *post* phase    | List of immutable entries of all previous step's contexts. Used by APL Jinja extensions described in §7 |

**Variable Availability**: All `result_*` variables are available in *post* phases and subsequent steps after a successful provider call. They are reset/updated on each new provider call.

#### 2.4.1 `usage` dict 

```python
{
  "prompt_tokens": 123,       # Number of tokens in the prompt sent to the LLM
  "completion_tokens": 456,   # Number of tokens in the LLM's response
  "total_tokens": 579         # Total number of tokens (prompt + completion)
}
```

#### 2.4.2 `context_history` list

A list of immutable context snapshots, where each entry is a frozen copy of the context at the end of each step. This allows you to access previous states of the context for debugging or analysis.

```python
[
  {"prev_step": None, "next_step": "greet", "result_text": "...", ...},  # Initial context
  {"prev_step": "greet", "next_step": "ask_name", "result_text": "...", ...},  # After 'greet' step
  ...
]
```

### 2.5 User-Settable Variables

The following variables can be set by users in *pre* phases to control LLM behavior. They are passed to the provider function via the context and live in the same global variable scope as executor-maintained variables:

| Variable                                      | Type           | Default value                                                                                 |
| --------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `model`                     | `str`                   | `"gpt-4o"`               | Default model when none set in *pre*.                                                                 |
| `temperature`               | `float`                 | `None`                   | Default temperature.                                                                                  |
| `allowed_tools`             | `list[str]`             | `[]`                     | If non‑empty, only these tools may be invoked.                                                     |
| `output_mode`               | `str`                   |  `None`                  | Output format: `text`, `json`, or `structured_output` |
| `output_structure`          | `str`                   | `None`                   | JSON Schema definition for when `output_mode` is `structured_output` |
| `max_tokens`                | `int`                   | `None`                   | Response token cap.                                                                                   |
| `top_p`                     | `float`                 | `None`                   | Nucleus sampling cutoff.                                                                              |
| `presence_penalty`          | `float`                 | `None`                   | Encourage new topics.                                                                                 |
| `frequency_penalty`         | `float`                 | `None`                   | Discourage repetition.                                                                                |
| `top_k`                     | `int`                   | `None`                   | Top‑k sampling.                                                                                       |
| `repetition_penalty`        | `float`                 | `None`                   | HF‑style repetition dampening.                                                                        |
| `stop_sequences`            | `list[str]`             | `[]`                     | Hard‑stop strings.                                                                                    |
| `seed`                      | `int \| null`           | `None`                   | Fixed RNG seed.                                                                                       |
| `logit_bias`                | `dict[str,int]`         | `{}`                     | OpenAI token‑bias map.                                                                                |

---

## 3 - Prompt Message Schema

Right after evaluating the **prompt** as a Jinja template, the executor transforms it into the standard OpenAI structured message format and stores it in the `prompts` variable. **The executor automatically parses any annotation directives (`@image_url`, `@audio_input`, `@file`) and converts them into OpenAI-standard message format.**

The Provider receives the executor `context` as first argument and can access the pre-processed `prompts` variable. 

The format of each message in the `prompts` **list** follows OpenAI's message schema:

```jsonc
{
  "role": "system",          // system, user, assistant, developer, tool_result
  "content": [               // can be string or array of content parts
    {
      "type": "text",
      "text": "<jinja template rendered text>"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/image1.png"
      }
    },
    {
      "type": "audio_input", 
      "audio_input": {
        "url": "https://example.com/audio1.mp3"
      }
    },
    {
      "type": "file",
      "file": {
        "url": "https://example.com/file1.pdf"
      }
    }
  ]
}
```

---

## 4 - Provider Contract

A provider function is registered via the `providers` option with key equal to the model name.

### 4.1 Python example

```python
from defuss_apl import start

agent = """
# prompt:
Mock a provider function that returns a greeting.
"""

async def provider(context: dict) -> dict:
    prompts      = context["prompts"]   # list of message dicts (schema §3)
    model        = context.get("model", "gpt-4o")
    temperature  = context.get("temperature", 0.7)
    # ... other user vars ...
    # Do steps described in §2.2.*  
    # Then return OpenAI-standard format:
    return {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Mocked response",
                    # tool_calls would go here if the LLM made any
                }
            }
        ],
        "usage": {  # optional
            "prompt_tokens": 5,
            "completion_tokens": 2,
            "total_tokens": 7
        }
    }

status = await start(agent, options={
    "with_providers": {"gpt-4o": provider},
})

print(status["result_text"])  # "Mocked response"
```

### 4.2 TypeScript example

```typescript
import { start } from "defuss-apl";
import type { Context, ProviderResponse } from "defuss-apl";

async function provider(context: Context): Promise<ProviderResponse> {
    const prompts = context.prompts; // list of message dicts (schema §3)
    const model = context.model || "gpt-4o";
    const temperature = context.temperature || 0.7;
    // ... other user vars ...
    // Do steps described in §2.2.*
    // Then return OpenAI-standard format:
    return {
        choices: [
            {
                message: {
                    role: "assistant",
                    content: "Mocked response",
                    // tool_calls would go here if the LLM made any
                }
            }
        ],
        usage: {  // optional
            prompt_tokens: 5,
            completion_tokens: 2,
            total_tokens: 7
        }
    };
}

const agent = `
# prompt:
Mock a provider function that returns a greeting.
`;
const status = await start(agent, {
    with_providers: { "gpt-4o": provider },
});
console.log(status.result_text); // "Mocked response"
```

---

## 5 - Native Tool Contract

A tool is registered via the `with_tools` option with key equal to the tool name. Each tool must be a dictionary containing the function reference, an optional context flag, and a standard OpenAI function description.

### 5.1 Tool Structure

Each tool in the `with_tools` mapping must be a dictionary with the following structure:

```jsonc
{
  "fn": <async_function>,           // The actual function to call
  "with_context": <boolean>,        // Optional, defaults to false
  "descriptor": {                   // Optional, Standard OpenAI function description
    "name": "tool_name",
    "description": "Tool description",
    "parameters": {
      "type": "object",
      "properties": {
        "param1": {
          "type": "string", 
          "description": "Parameter description"
        }
      },
      "required": ["param1"],
      "additionalProperties": false
    },
    "strict": true                  // Optional, for structured outputs
  }
}
```

#### 5.1.1 Automatic Descriptor Inference

If `descriptor` is not provided, runtimes that support type introspection (like Python) will automatically generate the descriptor using:

* `fn.__name__` for the tool name
* `inspect.getdoc(fn)` for the description  
* `inspect.signature(fn)` and `typing.get_type_hints(fn)` for parameter schema

Example of automatic inference in Python:

```python
def add(x: int, y: int) -> int:
    """Add two integers and return the sum."""
    return x + y
```

When `describeTools()` is called, it automatically generates:

```jsonc
{
   "name": "add",
   "description": "Add two integers and return the sum.",
   "parameters": {
     "type": "object", 
     "properties": {
       "x": {"type": "integer", "description": "x parameter"},
       "y": {"type": "integer", "description": "y parameter"}
     },
     "required": ["x", "y"],
     "additionalProperties": false
   }
}
```

For runtimes without type introspection support (like JavaScript/TypeScript), the `descriptor` field is required.

### 5.2 Python example

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

# with automatic function descriptor inference (Python runtime)
calc_tool = {
    "fn": calc,
    "with_context": True
}

status = await start(agent, options={
    "with_tools": {"calc": calc_tool}
})

print(status["result_tool_calls"][0]["content"]) # 42
```

### 5.3 TypeScript example

```ts
import { start } from "defuss-apl";
import { Context } from "defuss-apl";

async function calc(num1: number, num2: number, context?: Context) {
  return num1 + num2;
}

const calcTool = {
  fn: calc,
  with_context: true,
  descriptor: { // TypeScript does not emit metadata including argument names, types and TS/JSDoc (not even with legacy decorators)
    name: "calc",
    description: "Add two numbers together",
    parameters: {
      type: "object",
      properties: {
        num1: {
          type: "integer",
          description: "First number"
        },
        num2: {
          type: "integer",
          description: "Second number"
        }
      },
      required: ["num1", "num2"],
      additionalProperties: false
    },
    strict: true
  }
};

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
  with_tools: { calc: calcTool },
});
console.log(status["result_tool_calls"][0]["content"]); // 42
```

---

## 6 - Runtime API

| Function                                        | Purpose |                                                 
| ----------------------------------------------- | ------- | 
| `check(apl: str) -> bool` | Returns `True` on success or raises `ValidationError` with location‑specific details.                   |
| `start(apl: str, options: dict = {}) -> dict` | Validate then run template(s); returns the **final mutable context** (all variables) after termination. |
| `describeTools(context: dict) -> list` | Filtered by `allowed_tools` it returns a list of tool descriptions from `with_tools` and sets the `tools` variable context. |
| `callTool(tool_call: dict, context: dict) -> dict` | Executes a single tool call and returns the result in OpenAI tool call response format. |
| `callTools(pending_tool_calls: list, context: dict) -> list` | Executes pending tool calls and returns results in OpenAI tool call response format. |

### 6.1 `start()` Options

The `start()` function accepts an optional `options` dict to configure the executor.

| Option                      | Type                    | Default                  | Description                                                                                           |
| --------------------------- | ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| `timeout`                   | `int`                   | `120000` (ms)             | Wall‑clock timeout for entire run; `RuntimeError` on expiry.                                          |
| `with_providers`            | `dict[str, async func]` | `{}`                     | Model‑name → provider function (`context` dict) mapping.                                              |
| `base_url`                  | `str`                   | `https://api.openai.com` | Base URL for the default HTTP provider.                                                               |
| `api_key`                   | `str`                   | `"<API_KEY>"`            | Secret for default provider.                                                                          |
| `with_tools`                | `dict[str, dict]`       | `{}`                     | Tool‑name → tool configuration mapping (structure §5.1).                                             |
| `with_context`                 | `dict[str, any]`        | `{}`                     | Top‑level variables initially injected and available from for the first step's *pre* phase. Add your custom async functions here, as the context is flattened and passed down to the Jinja templates `render_async` function.                                                     |
| `debug`                     | `bool`                  | `false`                  | Emit verbose logs to stderr.                                                                          |
| `max_runs`                  | `int \| null`           | `null` (∞)               | Hard cap for `global_runs`.                                                                           |
| `jinja2_env`                | `jinja2.Environment`    | *auto*                   | Pass a custom Jinja2 environment (else APL creates one internally). The executor will switches  `enable_async` on for auto-await on custom coroutines.                                   |


### 6.2 Custom Jinja2 Environment Example

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
    "with_context": {
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
    with_context: {
        customer_name: 'Alice'
    }
};

// Execute the APL template with the custom Jinja2 environment
const status = await start(readFileSync("agent.apl", "utf-8"), options);
console.log(status);
```

---

## 7 - Built-in Jinja Extensions provided by the APL Runtime

The APL runtime provides custom Jinja tags and filters to simplify common patterns in *post* phases, especially for accessing tool call results and making control flow decisions.

### 7.1 Tool Result Filters

Since `tools` and `result_tool_calls` are linked by `call_id` but stored as separate lists, these filters provide convenient access patterns:

#### 7.1.1 `tool_result` Filter

Access tool call results by function name, returning the first result or a list of all results.

```jinja
{{ "calc" | tool_result }}              {# First result from calc tool #}
{{ "calc" | tool_result("all") }}       {# List of all calc results #}
{{ "calc" | tool_result(0) }}           {# First result (explicit index of current step) #}
{{ "calc" | tool_result(-1) }}          {# Last result (of current step) #}
```

#### 7.1.2 `tool_called` Filter

Check if a specific tool was called in the current step.

```jinja
{% if "calc" | tool_called %}
  Calculator was used in this step.
{% endif %}

{% if "image_gen" | tool_called %}
  Image generation was triggered.
{% endif %}
```

#### 7.1.3 `tool_count` Filter

Count how many times a tool was called.

```jinja
{% if "api_call" | tool_count > 3 %}
  Too many API calls, implement throttling.
{% endif %}
```

### 7.2 Control Flow Tags

#### 7.2.1 `{% for_tools %}` Iteration Tag

Iterate over tool results with automatic filtering.

```jinja
{# Iterate over all tool results #}
{% for_tool_results as tool_name, result %}
  Tool {{ tool_name }} returned: {{ result }}
{% endfor_tool_results %}

{# Iterate over specific tool results #}
{% for_tool_results "api_call" as result %}
  Processing API result {{ loop.index }}: {{ result }}
{% endfor_tool_results %}

{# Iterate with filtering #}
{% for_tool_results as tool_name, result if result.status == "success" %}
  Successful tool: {{ tool_name }} -> {{ result.data }}
{% endfor_tool_results %}
```

### 7.3 State and Error Handling Filters

#### 7.3.1 `prev` Filter

Access information about previous steps.

```jinja
{# Get result from specific previous step #}
Previous calculation LLM text result: {{ "calc_step" | prev("result_text") }}

{# Checking if a step was executed does not need the prev() filter #}
{% if "validation" eq prev_step %}
  Validation step was completed.
{% endif %}

{# Checking if a step was executed before the previous step (prev-prev) can be done using the prev() filter #}
{% if "validation" | prev("prev_step") %}
  Validation step was completed before the previous step.
{% endif %}

{# Get execution count for a step #}
Cycles/retries: {{ "some_step" | prev("runs") }}
```

This filter uses the `context_history` variable to access previous step data, which is automatically maintained by the executor.

### 7.4 Data Transformation Filters

#### 7.4.1 `json_get` Filter

Extract data from JSON results using JSONPath syntax.

```jinja
{# Extract nested data from tool results #}
{% set user_id = "some_api_call" | tool_result | json_get("$.user.id") %}
{% set items = "list_data" | tool_result | json_get("$.items[*].name") %}

{# With fallback values #}
{% set count = "stats" | tool_result | json_get("$.count", default=0) %}
```

### 7.5 Example Usage Patterns

#### 7.5.1 Complex Decision Logic

```jinja
# post: analysis
{% set score = "calculate_score" | tool_result %}
{% set validation = "validate_data" | tool_result %}

{% if score > 0.8 and validation.status == "passed" %}
  {% set next_step = "finalize" %}
  {% set confidence = "high" %}
{% elif score > 0.5 %}
  {% if "refine" | prev("runs") < 3 %}
    {%# let's refine some more #%}
    {% set next_step = "refine" %}
  {% else %}
    {% set next_step = "manual_review" %}
  {% endif %}
{% else %}
  {% set next_step = "error_handler" %}
  {% set error_reason = "Score too low: " ~ score %}
{% endif %}
```

#### 7.5.2 Batch Processing Logic

```jinja
# post: batch_process
{% set failed_items = [] %}
{% for result in "process_item" | tool_result("all") %}
  {% if result.status == "failed" %}
    {% set failed_items = failed_items + [result.item_id] %}
  {% endif %}
{% endfor %}

{% if failed_items | length > 0 %}
  {% set next_step = "retry_failed" %}
  {% set retry_items = failed_items %}
{% else %}
  {% set next_step = "summary" %}
{% endif %}
```

#### 7.5.3 Circuit Breaker Pattern

Time-based conditional logic for circuit breaking:

```jinja
{% if time_elapsed > 5000 %}
  Step has been running for more than 5 seconds.
  {% set next_step = "graceful_timeout_handler" %}
{% endif %}

{% if time_elapsed_global > 30000 %}
  Total workflow time exceeded 30 seconds.
  {% set next_step = "return" %}
{% endif %}
```