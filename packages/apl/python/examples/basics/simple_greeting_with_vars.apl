# pre: setup
{{ set('user_name', 'Alice') }}
{{ set('greeting', 'Hello') }}

# prompt: setup
## system
You are a friendly assistant.

## user
{{ get('greeting', 'Hello') }}, {{ get('user_name', 'User') }}! How are you doing today?

# post: setup
{{ set('next_step', 'return') }}
