# pre: first
{% if counter is not defined %}
    {{ set('counter', 1) }}
    {{ set('max_steps', 4) }}
{% endif %}

# prompt: first
This is step {{ get('counter', 1) }}. I'm executing the first step.

# post: first
{{ set('counter', get('counter', 1) + 1) }}
{% if get('counter', 1) <= get('max_steps', 4) %}
    {{ set('next_step', 'second') }}
{% else %}
    {{ set('next_step', 'final') }}
{% endif %}

# prompt: second
This is step {{ get('counter', 1) }}. I'm executing the second step.

# post: second
{{ set('counter', get('counter', 1) + 1) }}
{% if get('counter', 1) <= get('max_steps', 4) %}
    {{ set('next_step', 'first') }}
{% else %}
    {{ set('next_step', 'final') }}
{% endif %}

# prompt: final
This is the final step {{ get('counter', 1) }}. Workflow complete!

# post: final
{{ set('next_step', 'return') }}
