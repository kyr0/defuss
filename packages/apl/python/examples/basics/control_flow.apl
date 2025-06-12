# pre: first
{% if counter is not defined %}
    {{ set_context('counter', 1) }}
    {{ set_context('max_steps', 4) }}
{% endif %}

# prompt: first
This is step {{ get_context('counter', 1) }}. I'm executing the first step.

# post: first
{{ set_context('counter', get_context('counter', 1) + 1) }}
{% if get_context('counter', 1) <= get_context('max_steps', 4) %}
    {{ set_context('next_step', 'second') }}
{% else %}
    {{ set_context('next_step', 'final') }}
{% endif %}

# prompt: second
This is step {{ get_context('counter', 1) }}. I'm executing the second step.

# post: second
{{ set_context('counter', get_context('counter', 1) + 1) }}
{% if get_context('counter', 1) <= get_context('max_steps', 4) %}
    {{ set_context('next_step', 'first') }}
{% else %}
    {{ set_context('next_step', 'final') }}
{% endif %}

# prompt: final
This is the final step {{ get_context('counter', 1) }}. Workflow complete!

# post: final
{{ set_context('next_step', 'return') }}
