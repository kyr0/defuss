#!/usr/bin/env python3

import asyncio
from defuss_apl import start

async def test_set_context_function():
    print("🔧 Testing set_context function approach...")
    
    template = """
# pre: test
{{ set_context('test_data', {"user": {"name": "Alice", "items": [1, 2, 3]}}) }}
{{ set_context('name', get_json_path(test_data, "user.name", "unknown")) }}
{{ set_context('missing', get_json_path(test_data, "user.missing", "default")) }}
{{ set_context('item', get_json_path(test_data, "user.items.1", "none")) }}

Debug: test_data = {{ test_data }}
Debug: name = {{ name }}
Debug: missing = {{ missing }}
Debug: item = {{ item }}

# prompt: test
## user
Test message

# post: test
Debug: result_text = '{{ result_text }}'
Debug: Contains check = {{ "helpful" in result_text }}
{% if "helpful" in result_text %}
Debug: Condition is TRUE
{{ set_context('validation_passed', true) }}
{% else %}
Debug: Condition is FALSE  
{{ set_context('validation_passed', false) }}
{% endif %}
Debug: After conditional, validation_passed = {{ validation_passed }}
"""
    
    context = await start(template, {"debug": True})
    
    print(f"test_data: {context.get('test_data')}")
    print(f"name: {context.get('name')}")
    print(f"missing: {context.get('missing')}")
    print(f"item: {context.get('item')}")
    print(f"result_text: {repr(context.get('result_text'))}")
    print(f"validation_passed: {context.get('validation_passed')}")
    print(f"Errors: {context.get('errors', [])}")

if __name__ == "__main__":
    asyncio.run(test_set_context_function())
