# pre: setup
{{ set_context('max_retries', 2) }}

# prompt: setup
This is attempt #{{ get_context('runs', 0) + 1 }}. Please respond with something.

# post: setup
{% if errors and get_context('runs', 0) < get_context('max_retries', 2) %}
    {{ set_context('next_step', 'setup') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
