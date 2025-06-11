#!/usr/bin/env python3

import asyncio
from defuss_apl import start

async def debug_json_helper():
    print("🔧 Debugging JSON helper function...")
    
    template = """
# pre: test
{% set test_data = {"user": {"name": "Alice", "items": [1, 2, 3]}} %}
{% set name = get_json_path(test_data, "user.name", "unknown") %}
{% set missing = get_json_path(test_data, "user.missing", "default") %}
{% set item = get_json_path(test_data, "user.items.1", "none") %}

Debug: test_data = {{ test_data }}
Debug: name = {{ name }}
Debug: missing = {{ missing }}
Debug: item = {{ item }}

# prompt: test
## user
Name: {{ name }}, Missing: {{ missing }}, Item: {{ item }}
"""
    
    context = await start(template, {"debug": True})
    
    print(f"test_data: {context.get('test_data')}")
    print(f"name: {context.get('name')}")
    print(f"missing: {context.get('missing')}")
    print(f"item: {context.get('item')}")
    print(f"Errors: {context.get('errors', [])}")

if __name__ == "__main__":
    asyncio.run(debug_json_helper())
