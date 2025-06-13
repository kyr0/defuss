For Version 1.2, we want to improve the Runtime API and context. 

- The specification should clearly state that the using `set` does NOT work for the context variables. `set()`, `set_context()` or a specific function like `next(step_anme)` must be used.
- The specification should clearly state that simply accessing context variables does not wotk. `get()`, `get_context()` or a specific function like `prev()` must be used.
- The relaxed mode is called "relaxed" mode now. The relaxed mode is enabled by default. Mixed usage of relaxed and non-relaxed mode syntax is allowed unless relaxed mode is explicitly disabled.
- The developer can disable the relaxed mode using relaxed=False (previously: relaxed=False/True). 
- The 6.1.1 description should be moved to the syntax secion 1.x.
- We add `prompts_rendered` to the context as a list. It is just the fully evaluated prompt (Jinja rendered version). It has to be added by the provider function right before the actual LLM is called. This is used by the new runtme function with call variant prompts("text")
- We add `tools_rendered` to the context as a list. This is the  evaluated described tools (Jinja rendered version). It has to be added by the provider function right before the actual LLM is called. This is used by the new runtme function with call variant tools("text")

- We also add runtime helpers:

prev() =>  get_context('prev_step', None)
// prev has no distinct setter function

next(step_name) => set_context('next_step', step_name)
// next has no getter function

result() -> get_context("result_text")
result(type) -> get_context("result_$type")
usage() -> get_context("usage")
runs() -> get_context("runs")
runs(global_or_step_name) -> get_context("global_runs") // pseudocode: when type is not None and not "global", lookup context_history and find the step_name, then sum up all runs.
time() -> get_context("time_elapsed")
time(global_or_step_name) -> same as runs(global_or_step_name) but for time
errors() -> get_context("errors")
errors(as_type) ->  get_context("errors") then when as_string is "string" concats with \n\n, json creates a string array 
prompts() -> get_context("prompts")
prompts(as_type) -> get_context("prompts") -> supports "json" as type and "text" for text-serialization in APL format (Jinja-evaluated, as sent to the LLM).
tools() -> get_context("prompts")
tools(as_type) -> same as prompts(as_type) but for tool descriptions, no "text" support
history() -> get_context("context_history")
history(step_name) -> get_context("context_history") filtered by a specific step_name

// pseudocode
get(var_name_or_path, default) => 
   if (is_json_path(var_name)) 
         use the  get_json_path(data, path, default)       
           (path not starting with $, like $.bar, but the variable name: Example "foo.bar" <- "foo" is the name of the variable in context, "bar" the property in the value of this variable (json path)
           else 
                  get_context(variable_name, default_value)

set(var_name_or_path, value) =>    same as get(..) but for setting variables

inc(var_name, default) => inc(var_name, default)
dec(var_name, default) => dec_context(var_name, default)

---

Hyperparameter helpers:

model(name) => set_context("model", name)
model() => get_context("model")

temperature(value) => set_context("temperature", value)
temperature() => get_context("temperature")

Go ahead with all the other hyperparameters / user-settable variables (§ 2.5)
