#!/usr/bin/env python3
"""
Calculator Demo

This example demonstrates:
- Tool calling with APL
- Function introspection
- Tool result processing
- Context-aware tools
"""

import asyncio
import os
from defuss_apl import start


def calculator(operation: str, a: float, b: float) -> float:
    """Perform basic math operations"""
    if operation == "add":
        return a + b
    elif operation == "subtract":
        return a - b
    elif operation == "multiply":
        return a * b
    elif operation == "divide":
        return a / b if b != 0 else float('inf')
    else:
        raise ValueError(f"Unknown operation: {operation}")


def get_weather(city: str) -> str:
    """Get weather information for a city (mock)"""
    weather_data = {
        "Paris": "Sunny, 22°C",
        "London": "Cloudy, 15°C", 
        "New York": "Rainy, 18°C",
        "Tokyo": "Clear, 25°C"
    }
    return weather_data.get(city, f"Weather data not available for {city}")


async def main():
    """Calculator and weather tool demo"""
    print("=== Calculator & Weather Demo ===")
    print("Demonstrates: Tool calling, function introspection, intelligent arguments")
    print()
    
    template = """
# pre: setup
{{ set_context('allowed_tools', ['calculator', 'get_weather']) }}

# prompt: setup
## system
You are a helpful assistant with access to tools.

## user
Please calculate 15 + 25, then multiply the result by 2. 
Also, what's the weather like in Paris?

# post: setup
{{ set_context('next_step', 'return') }}
"""
    
    print("📝 Template:")
    print(template)
    
    options = {
        "with_tools": {
            "calculator": {"fn": calculator},
            "get_weather": {"fn": get_weather}
        }
    }
    
    result = await start(template, options)
    
    print("✅ Results:")
    print(f"Tools available: {len(result['tools'])}")
    for tool in result['tools']:
        name = tool['function']['name']
        desc = tool['function']['description']
        print(f"   - {name}: {desc}")
    
    print(f"\nTool calls made: {len(result['result_tool_calls'])}")
    for call in result['result_tool_calls']:
        role = call['role']
        content = call['content']
        error = call.get('with_error', False)
        status = "ERROR" if error else "SUCCESS"
        print(f"   - {role}: {content} ({status})")
    
    print(f"\nFinal response: {result['result_text']}")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock provider with intelligent argument extraction")


if __name__ == "__main__":
    asyncio.run(main())
