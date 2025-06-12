# pre: setup
{{ set_context('allowed_tools', ['calculator', 'get_weather']) }}

# prompt: setup
Please calculate 15 + 25, then multiply the result by 2. 
Also, what's the weather like in Paris?
