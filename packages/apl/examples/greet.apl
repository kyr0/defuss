# pre: greet
{# for the executor #}
set('model', 'gpt-4o')
set('temperature', 0.7)
set('allowed_tools', ['calc', 'google'])
set('output_mode', 'json')

{# for the prompt #}
set('customer', customer_name|upper)

# prompt: greet       

## system
You are a polite agent.

## user
Write a greeting for {{ customer }}.

# post: greet
if "hurensohn" in result
    next('apologize')
endif

# pre: apologize

{# for the executor #}
set('model', 'gpt-o3')
set('temperature', 0.1)
set('output_mode', 'text')

# prompt: apologize           

## system:
You are a polite agent.

## user:
Write an apologize for {{ customer }}.