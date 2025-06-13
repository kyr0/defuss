# Simple Counter Example
# Demonstrates the inc() helper function for incrementing counters

# pre: increment
{{ inc('counter') }}

# prompt: increment
## user
Counter is now: {{ get_context('counter', 0) }}

# post: increment
{% if get_context('counter', 0) < 5 %}
{{ set_context('next_step', 'increment') }}
{% else %}
{{ set_context('next_step', 'finish') }}
{% endif %}

# prompt: finish
## user
Final counter: {{ get_context('counter', 0) }}
