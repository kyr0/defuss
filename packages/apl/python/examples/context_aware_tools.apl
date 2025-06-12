# pre: setup
{{ set_context('user_name', 'Bob') }}
{{ set_context('allowed_tools', ['context_aware_tool']) }}

# prompt: setup
## user
Use the context tool with the message "Hello from APL!"

# post: setup
{{ set_context('next_step', 'return') }}
