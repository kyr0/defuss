# Agentic Prompting Language (APL)

> Version: 1.2

APL is a Turing-complete, domain-specific language for writing multi‑step, branching LLM workflows (*Agentic Workflows*) in a **Markdown‑flavoured Jinja-syntax**. It gives you program‑level flow control, native tool invocation, and memory without any boilerplate code or third‑party framework. Run any agent on the server, or even in-browser. Python or TypeScript/JavaScript, locally or in the cloud, on-premise, on the edge and with any LLM provider and model.

---

## 0 - Feature Highlights

* **Full Jinja inside every block** — loops, filters, tags, environments. Ship your own extensions (think: *vector database memory* etc.) simply via custom tags and simple Jinja control logic to create the optimal   prompt context.
* **Graph‑like flow control** — set `next_step` in *post* to jump anywhere (cycles allowed); default is explicit termination (`return`).
* **Built‑in state** — flat vars (`result_text`, `runs`, `global_runs`, `time_elapsed`, `errors`, …) enable branching, throttling, circuit‑breaking.
* **Provider‑agnostic** — ships with an OpenAI‑style HTTP provider; register any async function in `providers` to work with any local/cloud/API/on-premise  model.
* **Native tool calling** — when the LLM emits a JSON tool‑call, the executor runs your async Python / TS function and returns the result back to the LLM.
* **Cross‑platform** — ships with several reference implementations: Python 3.11+ and TypeScript 5+ / modern JavaScript (Node & browser).
* **Tiny parser & runtime** — APL is driven by simple regexp parsing, a trivial dynamic executor, paired with Jinja template evaluation → LangChain‑class power without the bloat.

---

## 1 - Syntax Specification

Any APL template is a sequence of **steps**. Each step has a `pre`, `prompt`, and optional `post` phase. The `prompt` phase contains the actual prompt messages for the LLM to process, while `pre` and `post` are used for variable setup and control logic (processing the `result_text`, setting variables and deciding what `next_step` to call).

### 1.1 Step Heading

Each **step** comprises up to three **phases** in strict order `pre → prompt → post`. `pre` and `post` are optional; `prompt` is required. A step ends at the first level‑1 heading whose identifier differs.

A phase starts with a level‑1 heading **with `#` at column 0** (no leading spaces):

```
# <phase> : <step-name>
```

* `<phase>` ∈ `{pre, prompt, post}` (case‑insensitive; internal whitespace ignored).
* `<step-name>` (identifier, optional) — any printable chars except line‑breaks, `#`, or `:`. Pre-/ postfix spaces are trimmed.

  * After trimming surrounding whitespace a step identifier must match `^[^\n\r#:]+$`.
  * If the identifier is missing (an empty string), it's identifier defaults to `default`.
  * Identifiers are **case‑sensitive** and **unique within the template** (no other step with the same identifier can exist).
  * Duplicate identifiers in the same template raise an `Duplicate step identifier: <step-name>` validation error at validation time.
* The reserved identifier **`return`** (case‑sensitive) terminates execution when used as `next_step`. User templates may not declare a step with this identifier. Doing so raises `Reserved step identifier: return` at validation time.
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
* Therefore, the default model `gpt-4o` and other variables are used by the default LLM provider (OpenAI) as set in the executor options (see below) and the default endpoint (OpenAI API) is used to start the prompt.

#### 1.2.3 Multimodal example

The following template shows how to use the `image_url` directive to attach an image to the prompt:


```python
from defuss_apl import start

agent = """
# pre: greet me
{{ set_context('model', 'o4-mini') }}
{{ set_context('temperature', 0.1) }}
{{ set_context('customer_name', 'Aron Homberg') }}

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
  else → implicit return.
}
```

* If `next_step` is explicitly set in the *post* phase, the executor jumps to the step with that identifier.
* If `next_step` is not explicitly set in the *post* phase, the executor terminates execution and returns the final context.
* If `next_step` is set to the reserved identifier `return` (case‑sensitive), the executor terminates execution and returns the final context.
* If `next_step` is set to any non-existing step name, the executor raises `"Unknown step: <step_name>"` at runtime.
* `next_step` is case‑sensitive including the reserved identifier `return`, which terminates execution.
* **Circular References**: Circular `next_step` references are allowed. The template author is responsible for implementing circuit-breaking logic. Without proper circuit-breaking, the default timeout (120 seconds) will raise a timeout error at runtime.

### 2.2 Prompt Success & Retry Logic

A prompt is deemed *successful* if:

1. Provider does not raise an exception.
2. Provider returns a valid response.

A provider is supposed to:

#### 2.2.1 Call the LLM:

Read the `prompts` variable, which is a list of message dicts in OpenAI-standard format (see §3). Call the LLM in its native protocol:

* Use `describe_tools(context)` to generate tool descriptions from the `with_tools` mapping of the executor options, filtered by `allowed_tools` from context, and store in the `tools` context variable. This can be passed directly as a hyperparameter to the LLM provider.
* The `prompts` variable is already pre-processed by the executor with all attachments converted to OpenAI-standard format. Providers can use this directly or transform it to their native format as needed.
* Pass the final prompts and hyperparameters to the LLM provider.
* Provider functions MUST allow exceptions to bubble up to the executor, which will catch them and append error messages to the `errors` list.

#### 2.2.2 Process the LLM response:

Read and validate the response from the LLM provider and call native tools, selected by the LLM:

* Process the response messages from the LLM.
* **Tool Call Execution**: If the LLM response contains tool calls, they are executed immediately using `call_tools(context)`. The executor looks up functions in the `with_tools` variable mapping and calls the respective async functions. Tool calls are processed in the order they appear in the LLM response.
* **Tool Call Error Handling**: If any tool execution raises an exception, the error is appended to the `errors` list but execution continues. Failed tool calls are recorded in `result_tool_calls` with their error message as the `content` and the `with_error` flag set to `true`.
* **Tool Call Results**: The results of all tool executions are automatically stored in the `result_tool_calls` context variable as a list of tool call result objects.
* Return the response in OpenAI-standard format for the executor to process.

#### 2.2.3 Standard Tool Calling

In case the LLM supports standard OpenAI tool calling (see §5), the LLM provider can use the standard runtime functions `describe_tools(context)` and `call_tools(context)` to handle tool calling. 

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

When the LLM responds with custom tool calls, the provider function must parse the tool call messages, transform them into OpenAI format and execute each using the `call_tool(tool_call)` runtime function. 

Example of a valid `tool_call`:

```jsonc
{
  "id": "call_abc123",             // tool call ID, any string generated by LLM
  "type": "function",              // still uses "function" here
  "function": {
    "name": "calc",
    "arguments": "{ \"num1\": 40, \"num2\": 2 }"
  }
}
```

The `call_tool(tool_call)` function returns the result of the tool execution, which is then stored in the `result_tool_calls` context variable.

Example of a valid tool call result:

```jsonc
{
  "role": "tool",                  // role of the tool call result
  "tool_call_id": "call_abc123",  // exact ID from LLM tool call
  "content": 42,                   // actual tool execution result
  "with_error": false              // true if tool execution failed, false otherwise
}
```

**Note**: Tool call IDs are generated by the LLM and can be any string format. The executor accepts whatever ID the LLM provides without validation or uniqueness enforcement.

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
      "tool_call_id": "call_abc123",  // exact ID from LLM tool call
      "content": 42,                  // actual tool execution result, or error message if failed
      "with_error": false              // true if tool execution failed, false otherwise
    }
  ],           
  "result_image_urls": [],            // extracted from message.content (image_url content parts)
  "result_audio_inputs": [],          // extracted from message.content (audio_input content parts)
  "result_files": []                  // extracted from message.content (file content parts)
}
```

The executor automatically continues to:
1. Extracts text content from `message.content` (string or text parts of array)
2. Parse and store any `image_url`, `audio_input`, or `file` content parts in their respective result arrays
3. Execute any tool calls and stores results in `result_tool_calls`. Failed tool executions have their error messages appended to the `errors` list, but execution continues.
4. Set the `prompt_tokens`, `completion_tokens`, and `total_tokens` in the `usage` variable if present in the provider response.
5. When `output_mode` is set to `json` or `structured_output`, validate structured JSON output using `validate_schema(result_json, context)`. Schema validation errors are appended to the `errors` list but execution continues.
6. Set the `result_role` to the role of the primary return message (e.g., `assistant`), excluding tool call roles.
7. Set the `result_json` variable if the provider response contains a valid JSON object and `output_mode` is set to `json` or `structured_output`.
8. Increment the `runs` counter for the current step and `global_runs` for the entire workflow
9. Catch any errors during provider call or tool execution and append them to the `errors` list for the *post* phase to process.
10. Proceed to evaluate the *post* phase of the step, where the `next_step` can be set.

### 2.3 Variable Lifecycle

All phases share one mutable Jinja context.

* `errors` is reset to `[]` **after** each *post* phase, making it available throughout an entire step (all phases: *pre*, *prompt*, and *post*). Errors accumulate during a step and can be handled in the *post* phase. If not handled, they are discarded when moving to the next step.
* `time_elapsed` and `time_elapsed_global` are monotonic floats in **milliseconds**.
* Executor MAY expose a `max_runs` option (default ∞). Exceeding it raises `"Run budget exceeded"` at runtime.

### 2.4 Executor‑maintained Variables

| Name                  | Type          | When set                | Meaning                          |
| --------------------- | ------------- | ----------------------- | -------------------------------- |
| `prev_step`           | `str \| None` | start of step           | Identifier that just finished    |
| `next_step`           | `str`         | in *post*               | Branch target (`return` ends), only effective in *post*.    |
| `result_text`         | `str`         | after successful provider call     | Provider + tool chain output  (empty string if no text content)    |
| `result_json`         | `dict \| None` | after successful provider call     | JSON object from provider        |
| `result_tool_calls`   | `list`        | after successful provider call     | List of executed tool call results |
| `result_image_urls`   | `list[str]`   | after successful provider call     | List of image URLs from provider |
| `result_audio_inputs` | `list[str]`   | after successful provider call     | List of audio input URLs from provider |
| `result_files`        | `list[str]`   | after successful provider call     | List of file URLs from provider  |
| `result_role`         | `str`         | after successful provider call     | Role of the result message (empty string if no message)      |
| `usage`               | `dict \| None` | after successful provider call     | Token usage stats from provider response    |
| `runs`                | `int`         | after successful provider call     | Count for current step           |
| `global_runs`         | `int`         | after successful provider call     | Total successful prompts         |
| `time_elapsed`        | `float` ms    | each phase entry        | Milliseconds since current step began |
| `time_elapsed_global` | `float` ms    | each phase entry        | Milliseconds since workflow start     |
| `errors`              | `list[str]`   | throughout entire step | Error messages from all phases of the current step. Accumulates during *pre*, *prompt*, and *post* phases. Reset to empty list after each *post* phase.      |
| `prompts`             | `list`        | before provider call    | Chat history in provider schema  |
| `tools`               | `list`        | after `describe_tools()` or custom tool definitions | List of tool descriptions for LLM provider in OpenAI format |
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
    temperature  = context.get("temperature")  # None if not set
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

// Type definitions
interface Context {
  // Executor-maintained variables (§2.4)
  prev_step: string | null;
  next_step: string;
  result_text: string;
  result_json: Record<string, any> | null;
  result_tool_calls: Array<{
    role: "tool";
    tool_call_id: string;
    content: any;
    with_error: boolean;
  }>;
  result_image_urls: string[];
  result_audio_inputs: string[];
  result_files: string[];
  result_role: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
  runs: number;
  global_runs: number;
  time_elapsed: number;
  time_elapsed_global: number;
  errors: string[];
  prompts: Array<{
    role: "system" | "user" | "assistant" | "developer" | "tool_result";
    content: string | Array<{
      type: "text" | "image_url" | "audio_input" | "file";
      text?: string;
      image_url?: { url: string };
      audio_input?: { url: string };
      file?: { url: string };
    }>;
  }>;
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  context: Record<string, any>;
  context_history: Array<Context>;
  
  // User-settable variables (§2.5)
  model: string;
  temperature: number | null;
  allowed_tools: string[];
  output_mode: "text" | "json" | "structured_output" | null;
  output_structure: string | null;
  max_tokens: number | null;
  top_p: number | null;
  repetition_penalty: number | null;
  stop_sequences: string[];
  seed: number | null;
  logit_bias: Record<string, number>;
  
  // Allow additional custom properties
  [key: string]: any;
}

interface ProviderResponse {
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function provider(context: Context): Promise<ProviderResponse> {
    const prompts = context.prompts; // list of message dicts (schema §3)
    const model = context.model || "gpt-4o";
    const temperature = context.temperature; // undefined if not set
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

When `describe_tools()` is called, it automatically generates:

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
{{ set_context('model', 'gpt-4o') }}
{{ set_context('temperature', 0.7) }}
{{ set_context('allowed_tools', ['calc']) }}

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
import { start, type Context } from "defuss-apl";

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
{{ set_context('model', 'gpt-4o') }}
{{ set_context('temperature', 0.7) }}
{{ set_context('allowed_tools', ['calc']) }}

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
| `describe_tools(context: dict) -> list` | Filtered by `allowed_tools` it returns a list of tool descriptions from `with_tools` and sets the `tools` variable context. |
| `call_tool(tool_call: dict, context: dict) -> dict` | Executes a single tool call and returns the OpenAI-standard tool call result format. |
| `call_tools(pending_tool_calls: list, context: dict) -> list` | Executes pending tool calls and returns a list of OpenAI-standard tool call results. |
| `validate_schema(result_json: dict, context: dict) -> bool` | Validates `result_json` against the JSON schema defined in `output_structure`. Returns `True` if valid, raises schema validation error if invalid (error gets appended to `errors` list). |

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
| `relaxed`                   | `bool`                  | `false`                  | Enable relaxed syntax mode for *pre* and *post* phases (§6.1.1).                                        |
| `jinja2_env`                | `jinja2.Environment`    | *auto*                   | Pass a custom Jinja2 environment (else APL creates one internally). The executor will switches  `enable_async` on for auto-await on custom coroutines.                                   |

#### 6.1.1 Relaxed Syntax Mode

When the `relaxed: True` option is enabled, *pre* and *post* phases support a simplified syntax that omits Jinja2 delimiters (`{{ }}` and `{% %}`). The executor automatically transforms relaxed syntax into valid Jinja2 before parsing.

**Relaxed mode applies only to *pre* and *post* phases**. Prompt phases maintain full Jinja2 syntax for precise text output control.

 The relaxed mode preprocessor runs before Jinja2 parsing and transforms the simplified syntax into valid Jinja2 templates line-by-line. Complex multi-line expressions are not supported and require traditional Jinja2 syntax. If multi-line expressions are needed,
 the relaxed mode can be disabled by setting `relaxed: false` in the options (see §6.1.1.4).

##### 6.1.1.1 Transformation Rules

The relaxed mode preprocessor processes each line in *pre* and *post* phases:

1. **Empty lines and comments**: Preserved as-is
2. **Control flow keywords**: Lines starting with Jinja2 control keywords are wrapped with `{% %}`
3. **Expressions**: All other non-empty lines are wrapped with `{{ }}`
4. **Indentation**: Preserved for readability

**Control Keywords Detected:**
- `if`, `elif`, `else`, `endif`
- `for`, `endfor`
- `set`, `endset`  
- `with`, `endwith`


##### 6.1.1.2 Mixed Syntax

It is possible to mix relaxed syntax with traditional Jinja2 syntax in the same *pre* or *post* phase. The executor will process both styles correctly, allowing for flexibility in template design. The only requirement is that when using Jinja2 delimiters (`{{ }}` or `{% %}`), they must be present in the same line.

##### 6.1.1.3 Relaxed Syntax Examples

**Traditional syntax:**

```apl
# pre: greet
{{ set_context('user_name', 'World') }}
{{ set_context('greeting', 'Hello') }}

# post: greet
{% if global_runs < 2 and not result_text %}
    {{ set_context('next_step', 'greet') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
```

**Relaxed syntax:**

```apl
# pre: greet
set_context('user_name', 'World')
set_context('greeting', 'Hello')

# post: greet
if global_runs < 2 and not result_text
    set_context('next_step', 'greet')
else
    set_context('next_step', 'return')
endif
```

**Mixed mode syntax:**

```apl
# pre: greet
set_context('user_name', 'World')
set_context('greeting', 'Hello')

# post: greet
{% if global_runs < 2 and not result_text %}
    set_context('next_step', 'greet')
else
    set_context('next_step', 'return')
endif
```

##### 6.1.1.4 Disabling Relaxed Mode

```python
from defuss_apl import start

agent = """
# pre: greet
set_context('user_name', 'Alice')
set_context('greeting', 'Hello')

# prompt: greet
## user
{{ greeting }}, {{ user_name }}! How are you?

# post: greet
if "good" in result_text.lower()
    set_context('next_step', 'return')
else
    set_context('next_step', 'retry')
endif
"""

# Disable relaxed mode
status = await start(agent, {"relaxed": false})
```

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

### 6.3 Built-in Helper Functions

The APL runtime automatically adds the following helper functions to every template's context:

#### 6.3.1 `get_json_path(obj, path, default=None)`

Extract data using dot notation (e.g., `"user.profile.name"`)

**Function Signature:**

```python
def get_json_path(obj: dict, path: str, default=None) -> any:
    """Extract data using dot notation. Supports array access with brackets.
    
    Examples:
    - get_json_path(data, "user.name") 
    - get_json_path(data, "items.0.title")
    - get_json_path(data, "nested.array.1.property", "fallback")
    """
```

---

## 7 - Common Jinja Patterns

APL uses standard Jinja2 templating. The APL runtime automatically provides a `get_json_path` helper function in the context for extracting data from JSON results and accessing nested data structures.

### 7.1 Working with Tool Results

```jinja
{# Iterate over all tool call results #}
{% for tool_call in result_tool_calls %}
  Tool {{ tool_call.tool_call_id }}: {{ tool_call.content }}
  {% if tool_call.with_error %}(ERROR){% endif %}
{% endfor %}

{# Filter successful results #}
{% for tool_call in result_tool_calls if not tool_call.with_error %}
  Success: {{ tool_call.content }}
{% endfor %}

{# Check if any tools failed #}
{% if result_tool_calls | selectattr('with_error') | list %}
  Some tools failed!
{% endif %}

{# Get first result from a specific tool by name #}
{% for tool_call in result_tool_calls %}
  {% if "calc" in tool_call.tool_call_id %}
    First calc result: {{ tool_call.content }}
    {% break %}
  {% endif %}
{% endfor %}

{# Count tool calls by type #}
{{ set_context('api_call_count', 0) }}
{% for tool_call in result_tool_calls %}
  {% if "api" in tool_call.tool_call_id %}
    {{ set_context('api_call_count', api_call_count + 1) }}
  {% endif %}
{% endfor %}
{% if api_call_count > 3 %}
  Too many API calls: {{ api_call_count }}
{% endif %}
```

### 7.2 Error Handling

```jinja
{# Check for errors #}
{% if errors %}
  {{ set_context('next_step', 'error_handler') }}
  Error details: {{ errors | join(" | ") }}
{% endif %}

{# Check for specific error types #}
{% for error in errors %}
  {% if "schema validation" in error %}
    Schema error: {{ error }}
  {% elif "tool execution" in error %}
    Tool error: {{ error }}
  {% elif "provider" in error %}
    Provider error: {{ error }}
  {% endif %}
{% endfor %}

{# Count total errors across workflow #}
{{ set_context('total_errors', context_history | map(attribute='errors') | map('length') | sum) }}
{% if total_errors > 5 %}
  Too many errors: {{ total_errors }}
{% endif %}
```

### 7.3 Previous Step Access

```jinja
{# Check if a specific step was the previous one #}
{% if prev_step == "validation" %}
  Validation step was completed.
{% endif %}

{# Get data from a specific previous step #}
{% for step_context in context_history %}
  {% if step_context.prev_step == "calc_step" %}
    Previous calc result: {{ step_context.result_text }}
    {% break %}
  {% endif %}
{% endfor %}

{# Get execution count for current step #}
Current step retries: {{ runs }}
Total workflow runs: {{ global_runs }}
```

### 7.4 Helper Functions

APL provides built-in helper functions for common operations:

#### 7.4.1 Variable Assignment - `set_context()`

Use `set_context(var_name, value)` to set context variables. This function works correctly with conditional logic and sequential execution:

```jinja
{# Set variables using set_context function #}
{{ set_context('model', 'gpt-4o') }}
{{ set_context('temperature', 0.7) }}
{{ set_context('customer_name', 'Aron Homberg') }}

{# Works with conditional logic #}
{% if "error" in result_text %}
{{ set_context('next_step', 'error_handler') }}
{% else %}
{{ set_context('next_step', 'continue_processing') }}
{% endif %}

{# Works with computed values #}
{{ set_context('retry_count', runs + 1) }}
{{ set_context('total_errors', context_history | map(attribute='errors') | map('length') | sum) }}
```

#### 7.4.2 Variable Access - `get_context()`

Use `get_context(var_name, default=None)` to retrieve context variables safely. This function provides access to runtime context variables within templates:

```jinja
{# Access variables set earlier with safe defaults #}
{{ get_context('user_name', 'Guest') }}
{{ get_context('retry_count', 0) }}

{# Use in calculations and conditionals #}
{{ set_context('total_retries', get_context('retry_count', 0) + 1) }}
{% if get_context('error_count', 0) > 3 %}
  {{ set_context('next_step', 'error_handler') }}
{% endif %}

{# Build complex data structures #}
{{ set_context('user_list', get_context('user_list', []) + [get_context('current_user', 'unknown')]) }}
{{ set_context('score_total', get_context('score_total', 0) + get_context('current_score', 0)) }}

{# Safe access prevents undefined variable errors #}
{% for item in get_context('items', []) %}
  Processing: {{ item }}
{% endfor %}
```

#### 7.4.3 Accumulator Functions - `add_context()` and `inc_context()`

APL provides helper functions for common accumulator patterns:

```jinja
{# Increment a counter (defaults to 0 if variable doesn't exist) #}
{{ inc_context('counter') }}
{{ inc_context('retry_count') }}

{# Add values to variables with default initialization #}
{{ add_context('total', 10) }}        {# total starts at 0, becomes 10 #}
{{ add_context('total', 5) }}         {# total becomes 15 #}

{# String concatenation #}
{{ add_context('message', 'Hello', '') }}  {# Initialize with empty string #}
{{ add_context('message', ' World') }}      {# message becomes "Hello World" #}

{# List accumulation #}
{{ add_context('items', [1, 2], []) }}     {# Initialize with empty list #}
{{ add_context('items', [3, 4]) }}         {# items becomes [1, 2, 3, 4] #}

{# Use in loops for sum calculations #}
{% for number in [10, 20, 30, 40, 50] %}
  {{ add_context('sum', number) }}
{% endfor %}
{# sum will be 150 #}

{# Counter patterns in iterative workflows #}
# pre: process_loop
{% if get_context('items') is none %}
{{ set_context('items', [1, 2, 3, 4, 5]) }}
{{ set_context('index', 0) }}
{% endif %}
{{ inc_context('processed_count') }}
{{ add_context('running_total', get_context('items', [])[get_context('index', 0)]) }}
{{ inc_context('index') }}

# post: process_loop
{% if get_context('index', 0) < get_context('items', [])|length %}
{{ set_context('next_step', 'process_loop') }}
{% endif %}
```

#### 7.4.4 JSON Data Access - `get_json_path()`

APL provides a `get_json_path` helper function for extracting data from JSON results:

```jinja
{# Set up test data and extract values #}
{{ set_context('test_data', {"user": {"name": "Alice", "items": [1, 2, 3]}}) }}
{{ set_context('user_id', get_json_path(test_data, "user.id", "unknown")) }}
{{ set_context('items', get_json_path(test_data, "items")) }}
{{ set_context('count', get_json_path(test_data, "count", 0)) }}

{# Extract data from tool results #}
{% for tool_call in result_tool_calls if not tool_call.with_error %}
  {{ set_context('user_id', get_json_path(tool_call.content, "user.id", "unknown")) }}
  {{ set_context('items', get_json_path(tool_call.content, "items")) }}
  {{ set_context('count', get_json_path(tool_call.content, "count", 0)) }}
  
  User: {{ user_id }}, Items: {{ items | length }}, Count: {{ count }}
{% endfor %}

{# Extract data from specific tool results #}
{% for tool_call in result_tool_calls %}
  {% if "api_call" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('status', get_json_path(tool_call.content, "status")) }}
    {{ set_context('data', get_json_path(tool_call.content, "data.items.0.name")) }}
    API Status: {{ status }}, First Item: {{ data }}
  {% endif %}
{% endfor %}
```

### 7.5 Control Flow Patterns

```jinja
{# Error-first decision making #}
{% if errors %}
  {{ set_context('next_step', 'error_handler') }}
{% elif time_elapsed > 5000 %}
  {{ set_context('next_step', 'timeout_handler') }}
{% elif runs > 3 %}
  {{ set_context('next_step', 'retry_limit_reached') }}
{% else %}
  {{ set_context('next_step', 'continue_processing') }}
{% endif %}

{# Complex scoring logic using tool results #}
{% for tool_call in result_tool_calls %}
  {% if "calculate_score" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('score', get_json_path(tool_call.content, "score", 0)) }}
    {% if score > 0.8 %}
      {{ set_context('next_step', 'finalize') }}
    {% elif score > 0.5 and runs < 3 %}
      {{ set_context('next_step', 'refine') }}
    {% else %}
      {{ set_context('next_step', 'manual_review') }}
    {% endif %}
    {% break %}
  {% endif %}
{% endfor %}

{# Circuit breaker with global error tracking #}
{{ set_context('global_errors', context_history | map(attribute='errors') | map('length') | sum) }}
{% if global_errors > 10 %}
  Global error threshold exceeded: {{ global_errors }}
  {{ set_context('next_step', 'return') }}
{% elif time_elapsed_global > 30000 %}
  Workflow timeout exceeded
  {{ set_context('next_step', 'return') }}
{% endif %}

{# Batch processing with JSON extraction #}
{{ set_context('failed_items', []) }}
{% for tool_call in result_tool_calls %}
  {% if "process_item" in tool_call.tool_call_id %}
    {{ set_context('status', get_json_path(tool_call.content, "status")) }}
    {{ set_context('item_id', get_json_path(tool_call.content, "item_id")) }}
    {% if status == "failed" %}
      {{ set_context('failed_items', failed_items + [item_id]) }}
    {% endif %}
  {% endif %}
{% endfor %}

{% if failed_items | length > 0 %}
  {{ set_context('next_step', 'retry_failed') }}
  {{ set_context('retry_items', failed_items) }}
{% else %}
  {{ set_context('next_step', 'summary') }}
{% endif %}

{# Iterations - Breaking the cycle #}
# pre: iterate
{% if get_context('counter') is none %}
  {{ set_context('counter', 0) }}
  {{ set_context('max_iterations', 3) }}
{% endif %}

# prompt: iterate
## user
Iteration {{ get_context('counter', 0) + 1 }}

# post: iterate
{{ set_context('counter', get_context('counter', 0) + 1) }}
{% if get_context('counter', 0) < get_context('max_iterations', 3) %}
  {{ set_context('next_step', 'iterate') }}
{% else %}
  {{ set_context('next_step', 'complete') }}
{% endif %}

# prompt: complete
## user
Completed {{ get_context('counter', 0) }} iterations
```

#### 8 - Future Reserved Variables

The following variable names are reserved for future language enhancements and will raise a `Reserved variable: <variable_name>` validation error if accessed in templates:

**Parallel Execution & Synchronization:**
* `next_steps` - Reserved for parallel step execution
* `await_steps` - Reserved for step synchronization
* `parallel_results` - Reserved for parallel execution results
* `race_winner` - Reserved for first-completed parallel step results
* `concurrent_limit` - Reserved for controlling parallel execution concurrency

**Workflow Management:**
* `step_graph` - Reserved for workflow graph introspection
* `workflow_state` - Reserved for advanced workflow state management
* `checkpoint` - Reserved for workflow checkpointing
* `rollback` - Reserved for workflow rollback functionality
* `snapshot` - Reserved for context snapshots
* `resume_from` - Reserved for workflow resumption

**Advanced Tool Capabilities:**
* `tool_registry` - Reserved for dynamic tool registration
* `tool_dependencies` - Reserved for tool dependency management
* `tool_cache` - Reserved for tool result caching
* `streaming_tools` - Reserved for streaming tool responses
* `tool_timeout` - Reserved for per-tool timeout configuration

**Memory & State Management:**
* `memory` - Reserved for persistent memory across workflow runs
* `shared_state` - Reserved for state sharing between workflow instances
* `session` - Reserved for session-scoped data
* `workspace` - Reserved for workspace-scoped persistence
* `vector_store` - Reserved for vector database integration

**Observability & Debugging:**
* `trace` - Reserved for execution tracing
* `metrics` - Reserved for workflow metrics collection
* `profiler` - Reserved for performance profiling
* `debug_info` - Reserved for enhanced debugging information
* `audit_log` - Reserved for audit trail functionality

**Advanced Flow Control:**
* `conditions` - Reserved for advanced conditional logic
* `loops` - Reserved for loop constructs
* `break_points` - Reserved for debugging breakpoints
* `event_triggers` - Reserved for event-driven workflow execution
* `webhooks` - Reserved for webhook integration

**Provider & Model Management:**
* `model_fallbacks` - Reserved for automatic model fallback chains
* `provider_pool` - Reserved for provider load balancing
* `cost_tracking` - Reserved for cost monitoring
* `rate_limits` - Reserved for rate limiting configuration
* `model_routing` - Reserved for intelligent model routing

**Security & Validation:**
* `permissions` - Reserved for permission management
* `sandbox` - Reserved for sandboxed execution
* `input_validation` - Reserved for input validation rules
* `output_sanitization` - Reserved for output sanitization
* `security_context` - Reserved for security context management

**Integration & Extensions:**
* `plugins` - Reserved for plugin system
* `extensions` - Reserved for language extensions
* `middleware` - Reserved for middleware functions
* `interceptors` - Reserved for request/response interception
* `transformers` - Reserved for data transformation pipelines

**Workflow Composition:**
* `sub_workflows` - Reserved for nested workflow execution
* `workflow_imports` - Reserved for workflow composition
* `macro_steps` - Reserved for step macros/templates
* `step_library` - Reserved for reusable step libraries
* `template_inheritance` - Reserved for template inheritance

**Real-time & Streaming:**
* `streaming_mode` - Reserved for streaming execution
* `real_time_updates` - Reserved for real-time state updates
* `push_notifications` - Reserved for push notification integration
* `websocket_handlers` - Reserved for WebSocket integration
* `sse_streams` - Reserved for Server-Sent Events

**Note**: These variables are not implemented in version 1.1 but are reserved to ensure forward compatibility. Future versions of APL may implement these features without breaking existing templates.
