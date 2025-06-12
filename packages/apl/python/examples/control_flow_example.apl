# pre: first
{{ set_context('counter', 1) }}

# prompt: first
This is step {{ get_context('counter', 0) }}.

# post: first
{{ set_context('counter', get_context('counter', 0) + 1) }}
{% if get_context('counter', 0) <= 3 %}
    {{ set_context('next_step', 'second') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}

# prompt: second
This is step {{ get_context('counter', 0) }}.

# post: second
{{ set_context('counter', get_context('counter', 0) + 1) }}
{% if get_context('counter', 0) <= 3 %}
    {{ set_context('next_step', 'first') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
