# pre: test
{{ set_context('counter', 1) }}

# prompt: test
Starting with counter: {{ get_context('counter', 1) }}

# post: test
{{ set_context('counter', get_context('counter', 1) + 1) }}
Counter after increment: {{ get_context('counter', 1) }}
{% if get_context('counter', 1) >= 3 %}
Next step will be: final
{{ set_context('next_step', 'final') }}
{% else %}
Next step will be: test
{{ set_context('next_step', 'test') }}
{% endif %}

# prompt: final
Final step reached with counter: {{ get_context('counter', 1) }}

# post: final
{{ set_context('next_step', 'return') }}
