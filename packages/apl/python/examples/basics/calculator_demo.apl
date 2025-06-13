# pre: setup
{{ set('allowed_tools', ['calculator', 'get_weather']) }}

# prompt: setup
## system
You are a helpful assistant with access to tools.

## user
Please calculate 15 + 25, then multiply the result by 2. 
Also, what's the weather like in Paris?

# post: setup
{{ set('next_step', 'return') }}
