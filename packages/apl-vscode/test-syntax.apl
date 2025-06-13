# pre: greet
set('user_name', 'World')
set('greeting', 'Hello')

# prompt: greet me
## system
You are a friendly assistant.

## user
{{ greeting }}, {{ user_name }}! How are you today?
@image_url https://example.com/image.png

# post: greet
if global_runs < 2 and not result_text
    set('next_step', 'greet')
    counter = counter + 1
elif "good" in result_text.lower()
    set('next_step', 'return')
else
    for i in range(3)
        set('retry_count', i)
    endfor
    set('next_step', 'retry')
endif

# pre: retry
set('attempt', global_runs)

# prompt: retry
## user
Let me try again. {{ greeting }}, {{ user_name }}!

# post: retry
{# so cool! #}
{% if global_runs > 5 %}
    set('next_step', 'return')
else
    set('next_step', 'greet')
endif
