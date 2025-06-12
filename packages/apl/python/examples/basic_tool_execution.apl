# pre: setup
{{ set_context('user_name', 'Alice') }}
{{ set_context('allowed_tools', ['calculator', 'get_weather']) }}

# prompt: setup
## system
You are a helpful assistant with access to tools.

## user
Hello! Please calculate 15 + 25 and tell me the weather in Paris.

# post: setup
{{ set_context('next_step', 'return') }}
