# pre: setup
{{ set('max_retries', 2) }}

# prompt: setup
This is attempt #{{ get('runs', 0) + 1 }}. Please respond with something meaningful.

# post: setup
{% if errors and get('runs', 0) < get('max_retries', 2) %}
    {{ set('next_step', 'setup') }}
{% else %}
    {{ set('next_step', 'return') }}
{% endif %}
