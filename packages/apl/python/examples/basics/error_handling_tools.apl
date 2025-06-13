# pre: setup
{{ set('allowed_tools', ['failing_tool']) }}
{{ set('attempt', 1) }}

# prompt: setup
{% if get('attempt', 1) == 1 %}
Please use the failing tool with message "This should fail".
{% else %}
Please use the failing tool with message "This should work".
{% endif %}

# post: setup
{% if errors and get('attempt', 1) < 2 %}
    {{ set('attempt', get('attempt', 1) + 1) }}
    {{ set('next_step', 'setup') }}
{% else %}
    {{ set('next_step', 'return') }}
{% endif %}
