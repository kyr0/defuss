# pre: greet

{# for the executor #}
{{ set_context('model', 'gpt-4o') }}
{{ set_context('temperature', 0.7) }}
{{ set_context('allowed_tools', ['calc', 'google']) }}
{{ set_context('output_mode', 'json') }}

{# for the prompt #}
{{ set_context('customer', customer_name|upper) }}

# prompt: greet       

## system
You are a polite agent.

## user
Write a greeting for {{ customer }}.

# post: greet
{% if "angry" in result %}
    {{ set_context('next_step', 'apologize') }}
{% endif %}

# PRE: apologize

{# for the executor #}
{{ set_context('model', 'gpt-o3') }}
{{ set_context('temperature', 0.1) }}
{{ set_context('output_mode', 'text') }}

# PROMPT: apologize           

## system:
You are a polite agent.

## user:
Write an apologize for {{ customer }}.