# pre: greet
set_context('user_name', 'Alice')
set_context('greeting', 'Hello')

# prompt: greet
## system
You are a friendly assistant.

## user
{{ greeting }}, {{ user_name }}! How are you today?

# post: greet
if "good" in result_text.lower()
    set_context('next_step', 'return')
else
    set_context('retry_count', get_context('retry_count', 0) + 1)
    if get_context('retry_count', 0) < 3
        set_context('next_step', 'greet')
    else
        set_context('next_step', 'return')
    endif
endif
