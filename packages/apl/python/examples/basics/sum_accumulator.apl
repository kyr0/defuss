# pre: sum_loop
{% if get('numbers') is none %}
{{ set('numbers', [10, 20, 30, 40, 50]) }}
{{ set('index', 0) }}
{% endif %}
{% set current_number = get('numbers', [])[get('index', 0)] %}
{{ add('total', current_number, 0) }}
{{ inc('index') }}

# prompt: sum_loop
## user
Added {{ current_number }} to running total. Current sum: {{ get('total', 0) }}

# post: sum_loop
{% if get('index', 0) < get('numbers', [])|length %}
{{ set('next_step', 'sum_loop') }}
{% else %}
{{ set('next_step', 'result') }}
{% endif %}

# prompt: result
## user
Final sum: {{ get('total', 0) }}
All numbers processed successfully!
