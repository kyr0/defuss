# Agentic Programming Language (APL) - v0.1

APL is a **paper-thin wrapper around plain Jinja** that lets you script multi-step, branching LLM workflows (marketing speech: `Agentic Workflows`) in one (or many) plain text files:

```
# pre: stepName   ── optional Jinja pre-logic
# prompt: stepName
## system         ── system prompt text
## user           ── user  prompt text
# post: stepName  ── optional Jinja post-logic
```

* **No new grammar inside blocks.** You keep full Jinja (loops, filters, custom tags).
* **Flow execution with program control:** APL comes with a built-in workflow executor. It orchestrates the execution flow like walking down an ever-changing AST. Simply set `next_step` in a *post* block to jump to some next step.
* **State access:** last outputs, run counters, time measurements and error states are injected as flat variables (`result`, `prev_step`, `runs`, `global_runs`, `time_elapsed`, `error` etc.) so you can introspect, branch and circuit-break. Create the most decent, cyclic or acyclic agentic workflows.
* **LLM provider agnostic:** APL comes with one built-in provider for calling OpenAI-compatible LLM endpoints via HTTP(S). If you need anything else, the APL Executor API provides a `providers` option to add your own provider executor function - it's a single async function that takes the variable context and returns the LLM response as text. This way you can use any LLM provider, or even a local model.
* **Native tools support:** APL comes with a built-in tool executor that can call any async function you registered using the `tools` option of the Executor API. This way you can use any Python function as a tool, or even register an LLM provider as a tool. Tools are called when the LLM response contains a tool call, and the executor will automatically handle the tool execution and return the result to the LLM.
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
- `<step-name>`: any printable text; executor slugifies it (`a-z`, `0-9`, `_`).
- A step may omit `pre` or `post` but at least one prompt block is required.
- `<phase-body>`: the content of the phase is is a Jinja template block, which can contain any valid Jinja syntax.

### Prompt phase

Inside `# prompt : <step-name>` the body is split into two sub-sections by level-2 headings:

```md
## system
<jinja lines …>

## user
<jinja lines …>
```

- `<prompt-phase>` ∈ `{system, user}` (case-insensitive, surrounding spaces and characters ignored, `## system  `, `## system:`, `## SYSTEM:` are fine).
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

In templates you must not create variables that collide with any of the patterns that are described in section **APL dynamic flow-state variables** below.
This is enforced by the executor, not the parser.

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

# post: greet
{% if "angry" in result %}
    {% set next_step = "apologize" %}
{% endif %}

# PRE: apologize

{# for the executor #}
{% set model = "gpt-o3" %}
{% set temperature = 0.1 %}
{% set output_mode = "text" %}

# PROMPT: apologize           

## system:
You are a polite agent.

## user:
Write an apologize for {{ customer }}.
```

## APL dynamic flow-state variables

These following patterns cover branching (`next_step`), introspection of recent outputs across all three phases *pre*, *main*, *post*, both local & global retry/budget logic, time tracking, and runtime errors all without requiring complex syntax.

**`<step_name_slug>`:**  is the sluggified version of a specific step's name. The slugify algorithm works like this: we take the step name → lower-case → keep ASCII letters & digits → replace everything else with an underscore (`_`).

**History/Backtrack depth:** configurable via executor option `backtrack_depth` (default 3). Only the most-recent *N* records per step & phase are exposed; older ones are dropped with each step (rolling history).

### Dynamic flow-state variable logic

The executor calls each step in three phases: 1. *pre*, 2. *main*, and 3. *post*. 
As long as no runtime error occurs and no `next_step` variable was set in the most recent *post* phase execution, 
each step is called in the natural order of the `.apl` file content (APL template) provided.

However, if a step’s *post* phase sets `next_step`, the executor will continue with that step instead. 
After finishing that step, it will continue from that step’s natural position, or, if the step has a *post* phase that sets `next_step`, 
it will continue with that step instead.

### Variable state persistency across phases and steps

The executor makes sure that while Jinja templates are executed in isolation, they have access to all variables that have been set before.
This allows the developer to set variables for global flow control, introspection, and state tracking.

### Executor-maintained main-phase flow control and state tracking

After the *post* phase of the `greet` step, the executor updates the following variables:

```jinja
prev_step            = "greet"  # may or may not be present
prev_step_greet      = "...main reply of greet..."
prev_step_pre_greet  = ""
prev_step_post_greet = ""
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
    ctx.runs_<step_name_slug>    = ctx.runs            # also inject for every known slug

after main phase succeeds:
    step_stats[slug] += 1
    total_runs      += 1
```

*Only main-phase completions increment the counters.*
Pre/Post code runs do **not** touch them, keeping semantics simple.

---

### Example variable context after three loops of “greet”

```jinja
global_runs = 3

# in greet (slug = greet)
runs_greet        = 3
runs_apologize = 0          # others still present

prev_step         = "greet"
prev_step_greet   = "...last greet reply..."
prev_step_pre_greet  = ""
prev_step_post_greet = ""

2nd_prev_step_greet          # history if backtrack_depth ≥ 2
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

### Variable context (reserved variables)

Each step can set variables in it's *pre* phase. These will be used by the selected execution provider when the step is executed.
The following variables are reserved for specific purposes, but can be overridden in any phase of a step as Jinja variable context is preserved across phases and steps.

| **Variable / Pattern** | **Who sets it**  | **Example value**        | **Purpose**                                       |       |                                                |
| ---------------------- | ---------------- | ------------------------ | ------------------------------------------------- | ----- | ---------------------------------------------- |
| `variables`                 | template (*pre*), executor                      | `{"var1": "value1", "var2": "value2"}` | Bulk (Jinja) variables to use. If not set, the executor uses the default Jinja variables configured in the executor options. This dict can contain any of the variables below. |
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
| `seed`                 | template (*pre*) | `12345`                  | Fixed RNG seed for reproducible sampling.         |       |                                                |
| `logit_bias`           | template (*pre*) | `{"198":-100, "823":10}` | Bias map applied to token logits (OpenAI style).  |       |                                                |

> **Provider mapping:** the executor **does not** convert these generic names to provider-specific fields (e.g. `max_tokens` → `max_output_tokens` for Google, `repetition_penalty` → `no_repeat_ngram_size` for HF models). This is the responsibility of the provider executor function you register with the `providers` option in the Executor API.

### Variable tracking

All of the variables that are described in all sections are available in the variable context and can be introspected, set, or modified in any phase of a step,
read and modified by the executor, tools, and execution providers. The following variables are set by the executor as part of the backtracking algorithm, and are available for introspection and use in the templates, but also useful for mock providers and tools to introspect the state of the execution flow.

| **Variable / Pattern** | **Who sets it**  | **Example value**        | **Purpose**                                       |       |                                                |
| ---------------------- | ---------------- | ------------------------ | ------------------------------------------------- | ----- | ---------------------------------------------- |
| `{k}th_<variable>`            | executor                              | `"gpt-4o"`                               | `<variable>` value used in the same step `k` completions ago (rolling history, depth =`backtrack_depth`, default 3). |
| `{k}th_<step_name_slug>_<variable>`            | executor                              | `"gpt-4o"`                               | `<variable>` of the step `<step_name_slug>` value used in the same step `k` completions ago (rolling history, depth =`backtrack_depth`, default 3). |

### Prompt tracking

The executor tracks the prompt text for each step, allowing you to introspect the prompt that was sent to the LLM.

| **Variable / Pattern**        | **Who sets it**                       | **Example (step name = `greet`, k = 2)** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `system_prompt`                      | executor, after Jinja-evaluation but before *main* provider invocation     | `You are a helpful assistant.` | System prompt of the  *main* phase, evaluated, so the provider execution function and the *post* phase can access it.                                |
| `user_prompt`                       | executor, after  Jinja-evaluation but before *main* provider invocation     | `Please write a greeting.` | User prompt of the  *main* phase, evaluated, so the provider execution function and the *post* phase can access it.                                  |
| `system_prompt_<step_name_slug>`               | executor                              | `You are a helpful assistant.`                           | System prompt of a specific previous step, evaluated, so the provider execution function and the *post* phase can access it.                            |
| `user_prompt_<step_name_slug>`               | executor                              | `Please write a greeting.`                           | User prompt of a specific previous step, evaluated, so the provider execution function and the *post* phase can access it.                            |
| `{k}th_system_prompt_<step_name_slug>`         | executor                              | `2nd_system_prompt_greet`                       | System prompt of the same step `k` completions ago (rolling history, depth =`backtrack_depth`, default 3).                 |
| `{k}th_user_prompt_<step_name_slug>`         | executor                              | `2nd_user_prompt_greet`                       | User prompt of the same step `k` completions ago (rolling history, depth =`backtrack_depth`, default 3).                 |

### Flow control

The executor allows you to control the flow of the execution by setting the `next_step` variable in the *post* phase of a step.
This variable determines which step will be executed next, allowing for dynamic branching in the workflow. With the `prev_step` variable, you can also introspect what the previous step was, and react accordingly (e.g. in an error recovery step).

| **Variable / Pattern**        | **Who sets it**                       | **Example (step name = `greet`, k = 2)** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `next_step`                   | template (*post*) or executor default | `"apologize"`                            | Name of the step the executor will run next. If not set by *post*, executor falls back to template (natural) order. Reserved name: `return` - this step is specially treated by the executor, stops the execution and returns control to the caller.                              |
| `prev_step`                   | executor                              | `"greet"`                                | Name of the step that has just completed (whatever phase finished last).  
| `{k}th_prev_step_<step_name_slug>`      | executor                              | `"greet"`                                | Name of the step that was the prev step for the step `<step_name_slug>` `k` runs ago (rolling history, depth =`backtrack_depth`, default 3).                 |

### Result tracking

Usually, when refining a result over multiple steps, you want to introspect the previous step's result to decide what to do next.
However, we sometimes branch or loop, and therefore need to account for multiple possible previous results.

| **Variable / Pattern**        | **Who sets it**                       | **Example (step name = `greet`, k = 2)** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `result`                      | previous step’s *main* completion     | `Hello Mr. Foo, I'm sorry you are angry` | Text content of the step that has just completed. Set by the executor after the *main* phase, so the *post* phase can access it.                                |
| `result_<step_name_slug>`               | executor                              | `result_greet`                           | **Main** result string of a specific previous step. Set by the executor after the *main* phase of that step.                            |
| `result_pre_<step_name_slug>`           | executor                              | `result_pre_greet`                       | *Pre*-phase output of a specific `prev_step`.                                                                                                   |
| `result_post_<step_name_slug>`          | executor                              | `result_post_greet`                      | *Post*-phase output of a specific `prev_step`.                                                                                                  |
| `{k}th_result_<step_name_slug>`         | executor                              | `2nd_result_greet`                       | **Main** result of the same step `k` completions ago (rolling history, depth =`backtrack_depth`, default 3).                 |
| `{k}th_result_pre_<step_name_slug>`     | executor                              | `3rd_result_pre_greet`                   | Older *pre*-phase output, same depth rule.                                                                                           |
| `{k}th_result_post_<step_name_slug>`    | executor                              | `2nd_result_post_greet`                  | Older *post*-phase output, same depth rule.                                                                                          |

### Retry/Budget logic

When agentic workflows recurse or loop, the executor tracks how many times each step has been run, both globally and per step. 
This allows your to branch, throttle, or stop execution (circuit breaker) based on how many times a step has been run, or how many main-phase LLM calls have been made so far.

| **Variable / Pattern**        | **Who sets it**                       | **Example (step name = `greet`, k = 2)** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `global_runs`                 | executor                              | `42`                                     | Total number of **main-phase** LLM calls made so far across the whole run. Incremented immediately after every main call. |
| `runs`                        | executor                              | `3`                                      | How many times the **current** step’s main has run. Available inside that step’s templates (*pre*, *main*, *post*).                                          |
| `runs_<step_name_slug>`                 | executor                              | `runs_greet = 7`                         | Per-step main-phase call counter (always available for *every* known `<step_name_slug>`).                                                          |

### Time tracking

Sometimes, you may want to track how long a step takes to complete, or how long the whole run takes. This allows you to break the execution if it takes too long, or to log the time taken for each step.

| **Variable / Pattern**        | **Who sets it**                       | **Example (step name = `greet`, k = 2)** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `time_elapsed`                    | executor                               | `59`                                     | Total time elapsed seconds since the start of the current step.                                                              |
| `time_elapsed_global`             | executor                              | `121`                                    | Total time elapsed seconds since the start of the whole run.                                                                 |
| `time_elapsed_<step_name_slug>`             | executor                              | `time_elapsed_greet = 12`                     | Time elapsed seconds since the start of the current step, for a specific step.                                                      |
| `{k}th_time_elapsed_<step_name_slug>`       | executor                              | `2nd_time_elapsed_greet = 8`                  | Time elapsed seconds since the start of the same step `k` completions ago (rolling history, depth =`backtrack_depth`, default 3). |

### Runtime error tracking and handling

Sometimes, a step may fail to complete successfully due to various reasons (e.g., LLM API errors, network issues, etc.).
In such cases, the executor will catch the error and set the following variables to track the error state, allowing for introspection and handling steps to catch and respond to errors gracefully (e.g. by checking the `error` variable in *post* and setting `next_step` together with the planned step name to run after error recovery).

| **Variable / Pattern**        | **Who sets it**                       | **Example (step name = `greet`, k = 2)** | **Meaning / When it is updated**                                                                                                     |
| ----------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `error`                       | executor                              | `Runtime error: <error_message>`         | previous step’s runtime error                               |
| `error_<step_name_slug>`                | executor                              | `error_greet`                            | Runtime error of a specific previous step, if any.                                                                                  |
| `{k}th_error_<step_name_slug>`          | executor                              | `2nd_error_greet`                        | Runtime error of the same step `k` completions ago (rolling history, depth =`backtrack_depth`, default 3).                 |

## APL Executor API

The APL executor API offers functions to `validate`, `execute` APL templates. Using executor options like `timeout`, `providers`, `tools` and `backtrack_depth`, you can configure the executor to use different LLM providers, tools, and other settings that are relevant for global flow control.

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
| `backtrack_depth`   | `number`           | `3`         | Maximum depth of history for backtracking. This controls how many previous results are kept for introspection. |
| `debug`             | `boolean`          | `false`     | If true, the executor will log debug information to the console. Useful for development and debugging. |
| `model`             | `string`           | `"gpt-4o"`  | Default LLM model to use for the main phase of steps. Can be overridden in the *pre* phase of each step. |
| `temperature`       | `number`           | `0.7`       | Default temperature for the LLM model. Can be overridden in the *pre* phase of each step.          |
| `allowed_tools`     | `string[]`         | `[]`        | Default list of tools that are allowed to be used in the main phase of steps. Can be overridden in the *pre* phase of each step. |
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

def my_tool(num1, num2):
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
    "calc_tool": my_tool
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

    user_prompt = context.get('user_prompt', '')
    system_prompt = context.get('system_prompt', '')

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
    const userPrompt = context.user_prompt || '';
    const systemPrompt = context.system_prompt || '';

    // Your provider logic here
    return `Mock LLM response based on context: ${userPrompt} ${systemPrompt}`;
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