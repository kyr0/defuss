# Comprehensive APL Test File

# pre: test_all_syntax
// This is a comment
set_context('name', 'World')
set_context('counter', 0)
if global_runs < 3
    counter = counter + 1
    set_context('status', 'running')
else
    set_context('status', 'done')
endif

# prompt: test_all_syntax
## system
You are a helpful assistant.

## user
Hello {{ name }}! Status: {{ status }}
Counter: {{ counter }}

# post: test_all_syntax
// Check result and decide next step
if "hello" in result_text.lower()
    set_context('next_step', 'success')
elif result_text and len(result_text) > 10
    set_context('next_step', 'retry')
else
    set_context('next_step', 'return')
endif

# prompt: success
## user
Great! The response was good.

# prompt: retry  
## user
Let me try again.
