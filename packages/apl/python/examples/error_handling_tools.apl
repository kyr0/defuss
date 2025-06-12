# pre: setup
{{ set_context('allowed_tools', ['failing_tool']) }}

# prompt: setup
## user
Use the failing tool.

# post: setup
{{ set_context('next_step', 'return') }}
