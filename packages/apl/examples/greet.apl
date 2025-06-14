# pre: greet
{# for the executor #}
set('model', 'gpt-4o')
set('temperature', 0.7)

{# for the prompt #}
set('customer', get('customer_name') | upper)

# prompt: greet       

## system
You are a polite agent.

## user
Write a greeting for {{ get('customer') | upper }}.