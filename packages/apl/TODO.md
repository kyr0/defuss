For Version 1.3, we want to improve the Runtime API and context. 

- Comments in relaxed mode code?! # or // 
- `current_step` should be defined
- We add `prompts_rendered` to the context as a list. It is just the fully evaluated prompt (Jinja rendered version). It has to be added by the provider function right before the actual LLM is called. This is used by the new runtme function with call variant prompts("text")
- We add `tools_rendered` to the context as a list. This is the  evaluated described tools (Jinja rendered version). It has to be added by the provider function right before the actual LLM is called. This is used by the new runtme function with call variant tools("text")

IDEAS:

- We could also add runtime helpers but need to rename internal variables to avoid conflicts with user-defined variables.:

usage() -> get("usage")
runs() -> get("runs")
runs(global_or_step_name) -> get("global_runs") // pseudocode: when type is not None and not "global", lookup context_history and find the step_name, then sum up all runs.
time() -> get("time_elapsed")
time(global_or_step_name) -> same as runs(global_or_step_name) but for time
errors() -> get("errors")
errors(as_type) ->  get("errors") then when as_string is "string" concats with \n\n, json creates a string array 
prompts() -> get("prompts")
prompts(as_type) -> get("prompts") -> supports "json" as type and "text" for text-serialization in APL format (Jinja-evaluated, as sent to the LLM).
tools() -> get("prompts")
tools(as_type) -> same as prompts(as_type) but for tool descriptions, no "text" support
history() -> get("context_history")
history(step_name) -> get("context_history") filtered by a specific step_name

---

Hyperparameter helpers:

Same as in the runtime API, but with a different name to avoid confusion.

model(name) => set("model", name)
model() => get("model")

temperature(value) => set("temperature", value)
temperature() => get("temperature")

Go ahead with all the other hyperparameters / user-settable variables (§ 2.5)
