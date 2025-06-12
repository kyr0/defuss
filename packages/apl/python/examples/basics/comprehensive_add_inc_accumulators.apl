# pre: accumulate
{{ inc_context('iteration_count') }}
{{ add_context('sum', 10) }}
{{ add_context('message', 'Step ', '') }}
{{ add_context('message', get_context('iteration_count', 0)|string) }}
{{ add_context('items', [get_context('iteration_count', 0)], []) }}

# prompt: accumulate
## user
Iteration {{ get_context('iteration_count', 0) }}: Sum={{ get_context('sum', 0) }}, Message="{{ get_context('message', '') }}", Items={{ get_context('items', []) }}

# post: accumulate
{% if get_context('iteration_count', 0) < 3 %}
{{ set_context('next_step', 'accumulate') }}
{% else %}
{{ set_context('next_step', 'summary') }}
{% endif %}

# prompt: summary
## user
Final Results:
- Total iterations: {{ get_context('iteration_count', 0) }}
- Final sum: {{ get_context('sum', 0) }}
- Final message: "{{ get_context('message', '') }}"
- All items: {{ get_context('items', []) }}
