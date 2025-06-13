# pre: increment
{{ inc('counter') }}

# prompt: increment
## user
Counter is now: {{ get('counter', 0) }}

# post: increment
{% if get('counter', 0) < 5 %}
{{ set('next_step', 'increment') }}
{% else %}
{{ set('next_step', 'finish') }}
{% endif %}

# prompt: finish
## user
Final counter value: {{ get('counter', 0) }}
Process completed!
