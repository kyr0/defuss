# pre: accumulate
{{ inc('iteration_count') }}
{{ add('sum', 10) }}
{{ add('message', 'Step ', '') }}
{{ add('message', get('iteration_count', 0)|string) }}
{{ add('items', [get('iteration_count', 0)], []) }}

# prompt: accumulate
## user
Iteration {{ get('iteration_count', 0) }}: Sum={{ get('sum', 0) }}, Message="{{ get('message', '') }}", Items={{ get('items', []) }}

# post: accumulate
{% if get('iteration_count', 0) < 3 %}
{{ set('next_step', 'accumulate') }}
{% else %}
{{ set('next_step', 'summary') }}
{% endif %}

# prompt: summary
## user
Final Results:
- Total iterations: {{ get('iteration_count', 0) }}
- Final sum: {{ get('sum', 0) }}
- Final message: "{{ get('message', '') }}"
- All items: {{ get('items', []) }}
