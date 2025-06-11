# pre: greet
{% set user_name = "World" %}
{% set greeting = "Hello" %}

# prompt: greet
## system
You are a friendly assistant.

## user
{{ greeting }}, {{ user_name }}! How are you today?

# post: greet
{% if global_runs < 2 and not result_text %}
    {% set next_step = "greet" %}
{% else %}
    {% set next_step = "return" %}
{% endif %}
