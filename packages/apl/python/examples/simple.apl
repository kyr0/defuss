# pre: greet
{{ set_context('user_name', 'World') }}
{{ set_context('greeting', 'Hello') }}

# prompt: greet
## system
You are a friendly assistant.

## user
{{ greeting }}, {{ user_name }}! How are you today?

# post: greet
{% if global_runs < 2 and not result_text %}
    {{ set_context('next_step', 'greet') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
