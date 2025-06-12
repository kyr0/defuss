# pre: setup
{{ set_context('user_name', 'Alice') }}
{{ set_context('greeting', 'Hello') }}

# prompt: setup
## system
You are a friendly assistant.

## user
{{ get_context('greeting', 'Hello') }}, {{ get_context('user_name', 'User') }}! How are you doing today?

# post: setup
{{ set_context('next_step', 'return') }}
