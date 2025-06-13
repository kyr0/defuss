# pre: demo
{{ set('framework', 'APL') }}
{{ set('version', '1.1') }}
{{ set('syntax', 'set_context') }}

# prompt: demo
## system
You are demonstrating {{ get('framework', 'APL') }} version {{ get('version', '1.1') }}.

## user
Show how the new {{ get('syntax', 'set_context') }} syntax improves APL templates.

# post: demo
{{ set('demo_complete', true) }}
{{ set('next_step', 'return') }}
