# pre: sum_loop
{% if get_context('numbers') is none %}
{{ set_context('numbers', [10, 20, 30, 40, 50]) }}
{{ set_context('index', 0) }}
{% endif %}
{% set current_number = get_context('numbers', [])[get_context('index', 0)] %}
{{ add('total', current_number, 0) }}
{{ inc('index') }}

# prompt: sum_loop
## user
Added {{ current_number }} to running total. Current sum: {{ get_context('total', 0) }}

# post: sum_loop
{% if get_context('index', 0) < get_context('numbers', [])|length %}
{{ set_context('next_step', 'sum_loop') }}
{% else %}
{{ set_context('next_step', 'result') }}
{% endif %}

# prompt: result
## user
Final sum: {{ get_context('total', 0) }}
All numbers processed successfully!
