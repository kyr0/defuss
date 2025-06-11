# pre: greet
{% set user_name = "Alice" %}
{% set allowed_tools = ["calculator", "get_weather"] %}

# prompt: greet
## system
You are a helpful assistant with access to tools.

## user
Hello {{ user_name }}! Please calculate 15 + 25 and tell me the weather in Paris.

# post: greet
{% set next_step = "return" %}
