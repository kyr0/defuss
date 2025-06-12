# pre: setup
{{ set_context('allowed_tools', ['calculator']) }}

# prompt: setup
## user
Please multiply 7 by 8.

# post: setup
{{ set_context('next_step', 'return') }}
