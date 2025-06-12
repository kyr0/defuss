# pre: greet
set_context('user_name', 'World')
set_context('greeting', 'Hello')
counter = 0

# prompt: greet me
## system
You are a friendly assistant.

## user
{{ greeting }}, {{ user_name }}! How are you today?
@image_url https://example.com/image.png

# post: greet
if global_runs < 2 and not result_text
    set_context('next_step', 'greet')
    counter = counter + 1
elif "good" in result_text.lower()
    set_context('next_step', 'return')
else
    for i in range(3)
        set_context('retry_count', i)
    endfor
    set_context('next_step', 'retry')
endif

# pre: retry
set_context('attempt', global_runs)

# prompt: retry
## user
Let me try again. {{ greeting }}, {{ user_name }}!

# post: retry
// comment 2
{# so cool! #}
{% if global_runs > 5 %}
    set_context('next_step', 'return')
else
    set_context('next_step', 'greet')
endif
