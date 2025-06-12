# pre: setup
{{ set_context('allowed_tools', ['failing_tool']) }}
{{ set_context('attempt', 1) }}

# prompt: setup
{% if get_context('attempt', 1) == 1 %}
Please use the failing tool with message "This should fail".
{% else %}
Please use the failing tool with message "This should work".
{% endif %}

# post: setup
{% if errors and get_context('attempt', 1) < 2 %}
    {{ set_context('attempt', get_context('attempt', 1) + 1) }}
    {{ set_context('next_step', 'setup') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
