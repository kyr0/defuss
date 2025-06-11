#!/usr/bin/env python3
"""
JSON Processing Example

This example demonstrates:
- Working with JSON outputs
- Structured data extraction
- get_json_path helper function
- JSON schema validation
"""

import asyncio
import os
from defuss_apl import start


def get_user_data(user_id: str) -> dict:
    """Mock API that returns user data"""
    users = {
        "123": {
            "id": "123",
            "name": "Alice Johnson", 
            "email": "alice@example.com",
            "profile": {
                "age": 28,
                "city": "San Francisco",
                "interests": ["programming", "hiking", "coffee"]
            },
            "stats": {
                "posts": 42,
                "followers": 156,
                "following": 89
            }
        },
        "456": {
            "id": "456",
            "name": "Bob Smith",
            "email": "bob@example.com", 
            "profile": {
                "age": 34,
                "city": "New York",
                "interests": ["photography", "travel", "music"]
            },
            "stats": {
                "posts": 28,
                "followers": 203,
                "following": 134
            }
        }
    }
    return users.get(user_id, {"error": "User not found"})


async def main():
    """JSON processing and data extraction"""
    print("=== JSON Processing Example ===")
    print("Demonstrates: JSON outputs, data extraction, get_json_path helper")
    print()
    
    template = """
# pre: setup
{{ set_context('allowed_tools', ['get_user_data']) }}
{{ set_context('output_mode', 'json') }}

# prompt: setup
## system
You are a data processing assistant. Use the get_user_data tool to fetch information for user ID "123" and "456", then create a summary.

## user
Please get user data for users 123 and 456, then create a JSON summary with their names, cities, and follower counts.

# post: setup
{{ set_context('user_count', 0) }}
{{ set_context('total_followers', 0) }}
{{ set_context('cities', []) }}

{% for tool_call in result_tool_calls %}
  {% if "get_user_data" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('user_count', get_context('user_count', 0) + 1) }}
    {{ set_context('name', get_json_path(tool_call.content, 'name', 'Unknown')) }}
    {{ set_context('city', get_json_path(tool_call.content, 'profile.city', 'Unknown')) }}
    {{ set_context('followers', get_json_path(tool_call.content, 'stats.followers', 0)) }}
    {{ set_context('total_followers', get_context('total_followers', 0) + get_context('followers', 0)) }}
    {{ set_context('cities', get_context('cities', []) + [get_context('city', 'Unknown')]) }}
    
    User processed: {{ get_context('name', 'Unknown') }} from {{ get_context('city', 'Unknown') }} ({{ get_context('followers', 0) }} followers)
  {% endif %}
{% endfor %}

Summary: {{ get_context('user_count', 0) }} users processed, {{ get_context('total_followers', 0) }} total followers
Cities: {{ get_context('cities', []) | join(", ") }}

{{ set_context('next_step', 'return') }}
"""
    
    print("📝 Template:")
    print(template)
    
    options = {
        "debug": True,
        "with_tools": {
            "get_user_data": {"fn": get_user_data}
        }
    }
    
    result = await start(template, options)
    
    print("✅ Results:")
    print(f"Output mode: {result.get('output_mode')}")
    print(f"Users processed: {result.get('user_count', 0)}")
    print(f"Total followers: {result.get('total_followers', 0)}")
    print(f"Cities: {result.get('cities', [])}")
    
    if result['result_tool_calls']:
        print(f"\nTool calls executed: {len(result['result_tool_calls'])}")
        for i, call in enumerate(result['result_tool_calls']):
            print(f"   Call {i+1}: {call.get('tool_call_id', 'unknown')}")
            if isinstance(call['content'], dict):
                name = call['content'].get('name', 'Unknown')
                city = call['content'].get('profile', {}).get('city', 'Unknown')
                print(f"      → {name} from {city}")
    
    if result.get('result_json'):
        print(f"\nJSON output:")
        print(f"   {result['result_json']}")
    
    print(f"\nFinal response: {result['result_text']}")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock provider with intelligent JSON processing")


if __name__ == "__main__":
    asyncio.run(main())
