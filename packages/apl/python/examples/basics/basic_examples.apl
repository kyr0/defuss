# pre: demo
{{ set_context('framework', 'APL') }}
{{ set_context('version', '1.1') }}
{{ set_context('syntax', 'set_context') }}

# prompt: demo
## system
You are demonstrating {{ get_context('framework', 'APL') }} version {{ get_context('version', '1.1') }}.

## user
Show how the new {{ get_context('syntax', 'set_context') }} syntax improves APL templates.

# post: demo
{{ set_context('demo_complete', true) }}
{{ set_context('next_step', 'return') }}
