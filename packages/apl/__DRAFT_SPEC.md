# Agentic Programming Language (APL) - v0.1

APL is a **paper-thin wrapper around plain Jinja** that lets you script multi-step, branching LLM workflows (marketing speech: `Agentic Workflows`) in one (or many) plain text files:

```
# pre: stepName   - optional Jinja pre-logic
# prompt: stepName
## system         - system prompt text
## user           - user  prompt text
## assistant      - assistant prompt text
## developer      - developer prompt text
# post: stepName  - optional Jinja post-logic
```

* **No new grammar inside blocks.** You keep full Jinja (loops, filters, custom tags).
* **Flow execution with program control:** APL comes with a built-in workflow executor. It orchestrates the execution flow like walking down an ever-changing AST. Simply set `next_step` in a *post* block to jump to some next step.
* **State access:** last outputs, run counters, time measurements and error states are injected as flat variables (`result`, `prev_step`, `runs`, `global_runs`, `time_elapsed`, `error` etc.) so you can introspect, branch and circuit-break. Create the most decent, cyclic or acyclic agentic workflows.
* **LLM provider agnostic:** APL comes with one built-in provider for calling OpenAI-compatible LLM endpoints via HTTP(S). If you need anything else, the APL Executor API provides a `providers` option to add your own provider executor function - it's a single async function that takes the variable context and returns the LLM response as text. This way you can use any LLM provider, or even a local model.
* **Native tool calling support:** APL comes with a built-in tool executor that can call any async function you registered using the `tools` option of the Executor API. This way you can use any Python function as a tool, or even register an LLM provider as a tool. Tools are called when the LLM response contains a tool call, and the executor will automatically handle the tool execution and return the result to the LLM.
* **Standard Jinja template context**: Pass an existing Jinja2 environment and variables to the executor, and it will be used in all APL steps. This allows you to use existing, pre-configured Jinja variables, filters, and functions in your APL templates.
* **Tiny runtime:** a regex parser + sandboxed Jinja loop gives you LangChain-class power without the bloat.
* **Cross-platform:** APL isn't platform or language-specific. So far it comes with ready-made packages for Python 3.11+, TypeScript 5+ and JavaScript. Both server-side and client-side (browser) execution is supported.

Think of APL as *Markdown-flavoured Jinja on rails*: just enough structure to orchestrate complex agent behaviour, zero ceremony beyond that.

## Syntax Specification for APL (Agentic Programming Language)

This specification covers the APL domain-specific language (DSL). 
APL is a superset of Jinja. It covers only the top-level markup that wraps plain Jinja. 
Everything inside an APL step phase body is normal Jinja.

### Step

There are one or more steps in an APL template.
Each step consists of a *pre*, *prompt*, and *post* phase, where the *pre* phase is optional, the *prompt* phase is required, and the *post* phase is optional.

Step phases are introduced by the phase heading character `#` (like Markdown heading 1), followed by the  `<phase>` label `pre:`, `prompt:`, or `post:` and concluded with the `<step-name>`.

```md
# <phase> : <step-name>

<phase-body>
```

- `<phase>` ∈ `{pre, prompt, post}` (case-insensitive, surrounding spaces ignored).
- `<phase>` are case-insensitive; extra spaces are ignored (`#  pre:`, `# PRE:  ` are fine).
- `<step-name>`: any printable text; executor slugifies it (`a-z`, `0-9`, `_`) => `slug = step_name.lower().replace(r"[^a-z0-9]", "_")`
- A step may omit `pre` or `post` but at least one prompt block is required.
- `<phase-body>`: the content of the phase is is a Jinja template block, which can contain any valid Jinja syntax.

### Prompt phase

Inside `# prompt : <step-name>` the body is split into sub-sections by level-2 headings:

```md
## system
<jinja lines …>

## user
<jinja lines …>

## assistant
<jinja lines …>

## developer
<jinja lines …>

## tool_result
<jinja lines …>
```

- `<prompt-phase>` ∈ `{system, user, assistant, developer, tool_result}` (case-insensitive, surrounding spaces and characters ignored, `## system  `, `## system:`, `## SYSTEM:` etc. are fine).
- If one of the sub-sections is missing, its text is taken as empty.

### Whitespace & robustness rules

| Rule                                                                    | Effect                           |
| ----------------------------------------------------------------------- | -------------------------------- |
| Heading prefix may have leading spaces.                                 | `   #  pRomPt :   greet   ` is valid. |
| Heading keyword & colon can be padded.                                  | Same as above.                   |
| Blank lines anywhere are allowed and preserved inside bodies.           |                                  |
| Content of a phase ends at the *next* line that matches a level-1 phase-introducing heading (`# <phase> : <step-name>`). |
| Content of a prompt phase ends at the *next* line that matches a level-2 prompt-phase-introducing heading (`## <prompt-phase>`). |

### Comments

No dedicated comment token; just embed comments inside Jinja (`{# … #}`) or in Markdown paragraphs between phases.

### Reserved variable namespace (for completeness of syntax)

In templates you may override variables that are described in section **APL dynamic flow-state variables** below to customize the execution flow behaviour (such as `model`, `temperature`, `allowed_tools`, etc. per step in the **pre**-phase). If they are not set, the executor will use the default values configured in the executor options.

### Reserved Step Name `return`

The identifier **`return` is reserved** for the executor’s implicit termination step.

Rules:
- APL templates **MUST NOT define a step whose slugified name equals `return`**; doing so is a validation error.
- If the `validate` function encounters a step with the slugified name `return`, it will raise a `ValidationError` with the message: "Step name 'return' is reserved and cannot be used."

### Step-Name Uniqueness & Slug-Collision Handling

If a newly generated slug already exists, the `validate` function will raise a `ValidationError` with the message:
"Duplicate step: '{slug}'"

### Dynamic flow-state variable logic

The executor calls each step in three phases: 1. *pre*, 2. *prompt*, and 3. *post*. 
As long as no runtime error occurs and no `next_step` variable was set in the most recent *post* phase execution, 
each step is called in the natural order of the `.apl` file content (APL template) provided.

However, if a step’s *post* phase sets `next_step`, the executor will continue with that step instead. 
After finishing that step, it will continue from that step’s natural position, or, if the step has a *post* phase that sets `next_step`, it will continue with that step instead.

### Variable state persistency across phases and steps

The executor makes sure that while Jinja templates are executed in isolation, but every instance gets the environment and a copy of all context variables assigned. This allows the developer to set variables for global flow control, introspection, and state tracking.

### Executor-maintained prompt-phase flow control and state tracking

After the *post* phase of the `greet` step, the executor updates the following variables:

```jinja
prev_step            = "greet"  # may or may not be present
next_step           = "apologize"  # only if "angry" in result (Jinja template logic)
```

With this a template can branch like:

```jinja
{% if "angry" in result %}
    {% set next_step = "apologize" %}
{% endif %}
```

…and still reach any recent *pre*/*post* outputs when necessary, without ever touching dict syntax.

### Executor-maintained bookkeeping with backtracking

```text
on step start:
    ctx.runs           = step_stats[slug] + 1
    ctx.global_runs    = total_runs + 1

after prompt phase succeeds:
    step_stats[slug] += 1
    total_runs      += 1
```

*Only prompt-phase completions increment the counters.*
Pre/Post code runs do **not** touch them, keeping semantics simple.

---

### Example variable context after three loops of “greet”

```jinja
global_runs = 3

# in greet (slug = greet)
runs        = 3

prev_step         = "greet"
...
```

This means, that any APL step phases templates can access any variable and branch or throttle like e.g.:

```jinja
{% if runs > 5 %}
    {% set next_step = "fallback" %}
{% endif %}

{% if global_runs > 50 %}
    The agent has reached the maximum budget; summarise and stop.
{% endif %}
```

### Example APL template

Here's a fully valid APL DSL template that demonstrates the syntax:

```apl
# pre: greet

{# for the executor #}
{% set model = "gpt-4o" %}
{% set temperature = 0.7 %}
{% set allowed_tools = ["calc", "google"] %}
{% set output_mode = "json" %}

{# for the prompt #}
{% set customer = customer_name|upper %}

# prompt: greet       

## system
You are a polite agent.

## user
Write a greeting for {{ customer }}.
@image_url https://example.com/image1.png

## assistant
Hello Aron! How can I assist you today?
@image_url https://example.com/image2.png

## developer
I'm fine! I've discovered APL today! This will reduce my mental load by 50%!

# post: greet
{% if "angry" in result %}
    {% set next_step = "apologize" %}
{% endif %}

# PRE: apologize

{# for the executor #}
{% set model = "o3-mini" %}
{% set temperature = 0.1 %}
{% set output_mode = "text" %}

# PROMPT: apologize           

## system:
You are a polite agent.

## user:
Write an apologize for {{ customer }}.
```

### Tool-Call Message Schema

When an LLM wants to invoke a registered tool, it **must** emit a single JSON object (as its entire message content) with the following shape - identical to the OpenAI ""function-calling" style:

```jsonc
{
  "name": "<registered-tool-name>",   // string, REQUIRED
  "arguments": {                           // object, REQUIRED (may be empty {})
    // arbitrary, JSON-serialisable arguments expected by the tool
  }
}
```

Example:

```jsonc
{
  "name": "calc",
  "arguments": {
    "num1": 42,
    "num2": 58
  }
}
```

The executor recognises the object, runs the matching async Python/JS function (if registered), and
**inserts the tool’s return value** into the conversation as a new message:

```jsonc
{ "role": "tool_result", "content": "<tool-return-text>" }
```

Rules:
- If the LLM does not return a valid tool call JSON object, the executor will raise a validation runtime error.
- If the executor cannot find a matching registered tool function, the executor will raise a validation runtime error.
- The LLM may issue multiple tool calls in a step, but each call must be in its own message.

## APL dynamic flow-state variables

These following patterns cover branching (`next_step`), introspection of recent outputs across all three phases *pre*, *prompt*, *post*, both local & global retry/budget logic, time tracking, and runtime errors all without requiring complex syntax.

**`<step_name_slug>`:**  is the sluggified version of a specific step's name. The slugify algorithm works like this: we take the step name → lower-case → keep ASCII letters & digits → replace everything else with an underscore (`_`).

### Variable context (reserved variables)

Each step can set variables in it's *pre* phase. These will be used by the selected execution provider when the step is executed.
The following variables are reserved for specific purposes, but can be overridden in any phase of a step as Jinja variable context is preserved across phases and steps.

| **Variable / Pattern** | **Who sets it**  | **Example value**        | **Purpose**                                                                                    |
| ---------------------- | ---------------- | ------------------------ | -------------------------------------------------
| `variables`                 | template (*pre*), executor                      | `{"var1": "value1", "var2": "value2"}` | Bulk (Jinja) variables to use. If not set, the executor uses the default Jinja variables configured in the executor options. This dict can contain any of the variables below. |
| `prompts`             | template (*pre*), executor                      | See section "Prompts variable"          | All the prompt messages, including their roles, content, attached images, and files. |
| `model`                       | template (*pre*)                      | `"gpt-4o"`                               | Name of the LLM model to use. If not set, the executor uses the default model configured in the executor options. |
| `jinja2_env`                  | executor                              | `jinja2.Environment(...)`                 | Jinja environment to use. If not set, the executor uses the default Jinja environment configured in the executor options. |
| `temperature`                 | template (*pre*)                      | `0.7`                                    | Temperature for the LLM model, controlling randomness. If not set, the executor uses the default temperature configured in the executor options. |
| `allowed_tools`               | template (*pre*)                      | `["calc", "google"]`                     | List of tools that are allowed to be used. If not set, the executor uses the default tools configured in the executor options. |
| `output_mode`                 | template (*pre*)                      | `"json"`                                 | Output mode for the LLM model, e.g. `"text"` or `"json"`. If not set, the executor uses the default output mode configured in the executor options. |
| `max_tokens`           | template (*pre*) | `256`                    | Hard cap on tokens returned by the model.         |       |                                                |
| `top_p`                | template (*pre*) | `0.95`                   | Nucleus-sampling cutoff (probability mass).       |       |                                                |
| `presence_penalty`     | template (*pre*) | `0.6`                    | Encourages introduction of *new* tokens.          |       |                                                |
| `frequency_penalty`    | template (*pre*) | `-0.4`                   | Discourages repeating tokens.                     |       |                                                |
| `top_k`                | template (*pre*) | `40`                     | Top-k filtering (when supported).                 |       |                                                |
| `repetition_penalty`   | template (*pre*) | `1.15`                   | Generic repetition dampening (non-OpenAI models). |       |                                                |
| `stop_sequences`       | template (*pre*) | `["\n\nUser:", "<END>"]` | Array of strings that force the model to stop. |
| `seed`                 | template (*pre*) | `12345`                  | Fixed RNG seed number for reproducible sampling.         |       |                                                |
| `logit_bias`           | template (*pre*) | `{"198":-100, "823":10}` | Bias map applied to token logits (OpenAI style).  |       |                                                |

> **Provider mapping:** the executor **does not** convert these generic names to provider-specific fields (e.g. `max_tokens` → `max_output_tokens` for Google, `repetition_penalty` → `no_repeat_ngram_size` for HF models). This is the responsibility of the provider executor function you register with the `providers` option in the Executor API.

### Prompts variable

The `prompts` variable is a list of dictionaries, each representing a message in the prompt, forming the turns in a conversation. Each message has the following structure:

Example `prompts` variable content:

```json
[
    {"role": "system", "content": "You are a polite agent.", "image_urls": ["https://example.com/image1.png"]},
    {"role": "user", "content": "Write a greeting for Aron."},
    {"role": "assistant", "content": "Hello Aron! How can I assist you today?", "image_urls": ["https://example.com/image2.png"]},
    {"role": "developer", "content": "I'm fine! I've discovered APL today! This will reduce my mental load by 50%!"}
    {"role": "tool_result", "content": "<tool-return-text>" }
]
```

For respective APL prompt phase:

```apl
# prompt: greet

## system
You are a polite agent.
@image_url https://example.com/image1.png

## user
Write a greeting for Aron.

## assistant
Hello Aron! How can I assist you today?
@image_url https://example.com/image2.png

## developer
I'm fine! I've discovered APL today! This will reduce my mental load by 50%!
```

### Inline Attachments (`@image_url`, `@audio_input`, `@file`)

Inside any prompt sub-section (`system`, `user`, `assistant`, `developer`) you can attach media by placing one directive per line:

```
@image_url  <absolute-URL>
@audio_input <absolute-URL>   # optional – for audio files
@file   <absolute-URL>   # optional – for PDFs, CSVs, etc.
```

Rules:

| Item          | Constraint                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------- |
| Allowed roles | All four prompt roles.                                                                        |
| Placement     | Line must start with `@image_url`, `@audio_input`, or `@file` followed by a single space and the URL.      |
| Count         | Unlimited; each directive appends to the current message’s `image_urls`, `audio_inputs`, or `files` array. |
| URLs          | Must be HTTPS and publicly reachable; executor does not fetch or validate contents.           |

Example:

```apl
## user
Please describe this chart.
@image_url https://example.com/chart.png
@audio_input https://example.com/audio.mp3
@file  https://example.com/data.csv
```

The executor converts the above into the following `prompts` variable content:

```jsonc
[{
  "role": "user",
  "content": "Please describe this chart.",
  "image_urls": ["https://example.com/chart.png"],
  "audio_inputs": ["https://example.com/audio.mp3"],
  "files":  ["https://example.com/data.csv"]
}, ...]
```

Rules:
- The executor does not fetch or validate the contents of these URLs. It is up to you to ensure that the URLs are valid and accessible.
- The URLs must be absolute and publicly reachable (e.g., `https://example.com/image.png`).
- When an LLM generated a response and returns it via a Provider Executor function, it is up to the provider implementation to translate attachment URLs into the APL format as described above. This ensures that round-trips with chat history are consistently represented in the `prompts` variable when the template author copies the conversation history into the next step's prompt phase.

### Flow control

The executor allows you to control the flow of the execution by setting the `next_step` variable in the *post* phase of a step.
This variable determines which step will be executed next, allowing for dynamic branching in the workflow. With the `prev_step` variable, you can also introspect what the previous step was, and react accordingly (e.g. in an error recovery step).

| **Variable / Pattern**        | **Who sets it**                       | **Example** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `next_step`                   | template (*post*) or executor default | `"apologize"`                            | Name of the step the executor will run next. If not set by *post*, executor falls back to template (natural) order. Reserved name: `return` - this step is specially treated by the executor, stops the execution and returns control to the caller.                              |
| `prev_step`                   | executor                              | `"greet"`                                | Name of the step that has just completed (whatever phase finished last).  

### Result tracking

Usually, when refining a result over multiple steps, you want to introspect the previous step's result to decide what to do next.
However, we sometimes branch or loop, and therefore need to account for multiple possible previous results.

| **Variable / Pattern**        | **Who sets it**                       | **Example** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `result`                      | previous step’s *prompt* completion     | `Hello Mr. Foo, I'm sorry you are angry` | Text content of the step that has just completed. Set by the executor after the *prompt* phase, so the *post* phase can access it.                                |

### Retry/Budget logic

When agentic workflows recurse or loop, the executor tracks how many times each step has been run, both globally and per step. 
This allows your to branch, throttle, or stop execution (circuit breaker) based on how many times a step has been run, or how many prompt-phase LLM calls have been made so far.

| **Variable / Pattern**        | **Who sets it**                       | **Example** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `global_runs`                 | executor                              | `42`                                     | Total number of **prompt-phase** LLM calls made so far across the whole run. Incremented immediately after every prompt call. |
| `runs`                        | executor                              | `3`                                      | How many times the **current** step’s prompt has run. Available inside that step’s templates (*pre*, *prompt*, *post*).                                          |

### Time tracking

Sometimes, you may want to track how long a step takes to complete, or how long the whole run takes. This allows you to break the execution if it takes too long, or to log the time taken for each step.

| **Variable / Pattern**        | **Who sets it**                       | **Example** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `time_elapsed`                    | executor                               | `59`                                     | Total time elapsed seconds since the start of the current step.                                                              |
| `time_elapsed_global`             | executor                              | `121`                                    | Total time elapsed seconds since the start of the whole run.                                                                 |

### Runtime error tracking and handling

Sometimes, a step may fail to complete successfully due to various reasons (e.g., LLM API errors, network issues, etc.).
In such cases, the executor will catch the error and set the following variables to track the error state, allowing for introspection and handling steps to catch and respond to errors gracefully (e.g. by checking the `error` variable in *post* and setting `next_step` together with the planned step name to run after error recovery).

| **Variable / Pattern**        | **Who sets it**                       | **Example** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `error`                       | executor                              | `Runtime error: <error_message>`         | previous step’s runtime error                               |


## APL Executor API

The APL executor API offers functions to `validate`, `execute` APL templates. Using executor options like `timeout`, `providers`, and `tools`, you can configure the executor to use different LLM providers, tools, and other settings that are relevant for global flow control.

### Functions

| **Function** | **Description** |
| ------------- | ---------------- |
| `validate(apl_template: str) -> bool` | Validates the APL template syntax and returns `True` if valid. Throws specific validation errors if invalid. |
| `execute(apl_template: str, options: dict = {}) -> dict` | Executes the APL template with the provided options and returns the final result as the final variable context as a dictionary. |

### Testing and Mocking

The executor API allows to set providers and tools. This enables you to mock external dependencies and control the execution environment for testing purposes 
by implementing a mock provider or tool function that simulates the behavior of an LLM provider or tool at any point in the execution flow (see below for examples).

### Example

#### Execute an APL template

To run an APL template, you can use the `execute` function from the APL executor API.

```python
from defuss_apl import execute
execute(open("workflow.apl").read(), options={...})
```
Without specific options, the executor uses the default OpenAI provider, default base URL and model - therefore choosing OpenAI and the gpt-4o model.

### Executor Options

All options are optional, and the executor will use sensible defaults if not provided. The options can be passed as a dictionary to the `execute` function.

| **Option**          | **Type**            | **Default** | **Description**                                                                                     |
| ------------------- | ------------------ | ----------- | --------------------------------------------------------------------------------------------------- |
| `timeout`           | `number` (ms)      | `30000`     | Maximum time to wait for the global LLM response. If exceeded, the executor will throw a RuntimeError with message: "Timeout error after <timeout> ms."   |
| `providers`         | `Record<string, Function>` | `{}`        | Map of model names to provider executor functions. Each function takes the variable context and returns the LLM response as text. |
| `base_url`           | `string` (URL)      | `https://api.openai.com`     | Base URL for the default provider (OpenAI compatible HTTP client)  |
| `api_key`           | `string` (secret)      | `"<API_KEY>"`     | API key for the default provider (OpenAI compatible HTTP client)  |
| `tools`             | `Record<string, Function>` | `{}`        | Map of tool names to tool executor functions. Each function takes the variable context and returns the tool response as text. |
| `debug`             | `boolean`          | `false`     | If true, the executor will log debug information to the console. Useful for development and debugging. |
| `model`             | `string`           | `"gpt-4o"`  | Default LLM model to use for the prompt phase of steps. Can be overridden in the *pre* phase of each step. |
| `temperature`       | `number`           | `0.7`       | Default temperature for the LLM model. Can be overridden in the *pre* phase of each step.          |
| `allowed_tools`     | `string[]`         | `[]`        | Default list of tools that are allowed to be used in the prompt  phase of steps. Can be overridden in the *pre* phase of each step. |
| `output_mode`       | `string`           | `"json"`    | Default output mode for the LLM model. Can be overridden in the *pre* phase of each step.          |
| `max_tokens`        | `number`           | `256`       | Default maximum number of tokens to return from the LLM model. Can be overridden in the *pre* phase of each step. |
| `top_p`             | `number`           | `0.95`      | Default nucleus sampling cutoff for the LLM model. Can be overridden in the *pre* phase of each step. |
| `presence_penalty`  | `number`           | `0.6`       | Default presence penalty for the LLM model. Can be overridden in the *pre* phase of each step.      |
| `frequency_penalty` | `number`           | `-0.4`      | Default frequency penalty for the LLM model. Can be overridden in the *pre* phase of each step.     |
| `top_k`             | `number`           | `40`        | Default top-k filtering for the LLM model. Can be overridden in the *pre* phase of each step.       |
| `repetition_penalty`| `number`          | `1.15`      | Default repetition penalty for the LLM model. Can be overridden in the *pre* phase of each step.    |
| `stop_sequences`    | `string[]`         | `[]`        | Default list of stop sequences for the LLM model. Can be overridden in the *pre* phase of each step. | 
| `seed`               | `number`           | `null`      | Default RNG seed for reproducible sampling. Can be overridden in the *pre* phase of each step.      |
| `logit_bias`        | `Record<string, number>` | `{}`    | Default logit bias map for the LLM model. Can be overridden in the *pre* phase of each step.        |

#### Example Tool Registration

```python
from defuss_apl import execute

def calc_tool(num1, num2):
    """
    A simple tool that takes two numeric arguments and returns their sum.
    :param num1: First number
    :param num2: Second number
    :return: Sum of num1 and num2
    """
    # Your tool logic here
    return num1 + num2

# Register the tool with the executor
tools = {
    "calc": calc_tool
}
# Execute the APL template with the tool registered
result = execute(open("workflow.apl").read(), options={"tools": tools})
print(result)
```

```typescript
import { execute } from 'defuss-apl';

async function myTool(num1: number, num2: number): Promise<number> {
    // Your tool logic here
    return num1 + num2;
}

// Register the tool with the executor
const tools = {
    calc_tool: myTool
};
// Execute the APL template with the tool registered
const result = await execute(open("workflow.apl").read(), { tools });
console.log(result);
```

### Example Provider Registration

You can register your own LLM provider by implementing a function that takes the variable context and returns the LLM response as text. This allows you to use any LLM provider, or even a local model. A mock provider example is shown below, but you can implement any logic you need to call your LLM provider. It can be used in the `execute` function to simulate the execution environment and provide controlled inputs and outputs.

```python
from defuss_apl import execute
def mock_openai_provider(context):
    """
    A simple provider that takes the variable context and returns a mock LLM response.
    :param context: Variable context
    :return: Mock LLM response
    """

    prompt_messages = context.get('prompts', [])

    # Your provider logic here
    return "Mock LLM response based on context"

# Register the provider with the executor
providers = {
    # model name to provider function mapping
    "gpt-4o": mock_openai_provider
}

# Execute the APL template with the provider registered
result = execute(open("workflow.apl").read(), options={"providers": providers})
print(result)
```

```typescript
import { execute } from 'defuss-apl';
async function mockOpenAIProvider(context: Record<string, any>): Promise<string> {
    const promptMessages = context.prompts || [];

    // Your provider logic here
    return `Mock LLM response based on context: ${JSON.stringify(promptMessages, null, 2)}`;
}
// Register the provider with the executor
const providers = {
    // model name to provider function mapping
    'gpt-4o': mockOpenAIProvider
};
// Execute the APL template with the provider registered
const result = await execute(open("workflow.apl").read(), { providers });
console.log(result);
```

### Example of passing a custom Jinja2 Environment

You can pass a custom Jinja2 environment to the executor, allowing you to customize the Jinja2 rendering behavior, such as adding custom filters or globals.

```python 
from defuss_apl import execute
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
result = execute(open("workflow.apl").read(), options=options)
print(result)
```

```typescript
import { execute } from 'defuss-apl';
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
const result = await execute(open("workflow.apl").read(), options);
console.log(result);
```