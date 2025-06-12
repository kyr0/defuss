# pre: basic_test
{{ set_context('name', 'World') }}
{% if true %}
{{ set_context('greeting', 'Hello') }}
{% endif %}

# prompt: basic_test
## user
{{ greeting }}, {{ name }}!

# post: basic_test
{% if result_text %}
{{ set_context('next_step', 'return') }}
{% endif %}
