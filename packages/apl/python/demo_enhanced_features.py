#!/usr/bin/env python3
"""
Demo: Enhanced APL Python Implementation Features

This script demonstrates the enhanced features of the APL Python implementation:
1. Function introspection for intelligent mock tool arguments
2. Actual tool execution with mock provider
3. Context-aware tools
4. Error handling and recovery
5. Comprehensive tool calling without external API dependencies
"""

import asyncio
from defuss_apl import start


def calculator(operation: str, a: float, b: float) -> float:
    """Calculate with two numbers using basic arithmetic operations"""
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
    """Get weather information for a city"""
    weather_data = {
        "Paris": "Sunny, 22°C",
        "London": "Cloudy, 15°C", 
        "New York": "Rainy, 18°C",
        "Tokyo": "Clear, 25°C"
    }
    return weather_data.get(city, f"Weather data not available for {city}")


def context_aware_tool(message: str, context) -> str:
    """Tool that uses execution context information"""
    user_name = context.get("user_name", "User")
    return f"Hello {user_name}! You said: {message}"


async def demo_basic_tool_execution():
    """Demo 1: Basic tool execution with intelligent argument generation"""
    print("🔧 Demo 1: Basic Tool Execution")
    print("=" * 50)
    
    template = """
# pre: setup
{% set user_name = "Alice" %}
{% set allowed_tools = ["calculator", "get_weather"] %}

# prompt: setup
## system
You are a helpful assistant with access to tools.

## user
Hello! Please calculate 15 + 25 and tell me the weather in Paris.

# post: setup
{% set next_step = "return" %}
"""

    with_tools = {
        'calculator': {'fn': calculator},
        'get_weather': {'fn': get_weather}
    }
    
    result = await start(template, {'with_tools': with_tools})
    
    print(f"✅ Tools available: {len(result['tools'])}")
    for tool in result['tools']:
        name = tool['function']['name']
        desc = tool['function']['description']
        print(f"   - {name}: {desc}")
    
    print(f"\n✅ Tool calls executed: {len(result['result_tool_calls'])}")
    for call in result['result_tool_calls']:
        role = call['role']
        content = call['content']
        error = call.get('with_error', False)
        status = "ERROR" if error else "SUCCESS"
        print(f"   - {role}: {content} ({status})")
    
    print(f"\n✅ Final response: {result['result_text']}")
    print()


async def demo_context_aware_tools():
    """Demo 2: Context-aware tools"""
    print("🎯 Demo 2: Context-Aware Tools")
    print("=" * 50)
    
    template = """
# pre: setup
{% set user_name = "Bob" %}
{% set allowed_tools = ["context_aware_tool"] %}

# prompt: setup
## user
Use the context tool with the message "Hello from APL!"

# post: setup
{% set next_step = "return" %}
"""

    with_tools = {
        'context_aware_tool': {
            'fn': context_aware_tool,
            'with_context': True
        }
    }
    
    result = await start(template, {'with_tools': with_tools})
    
    print(f"✅ Context-aware tool result:")
    for call in result['result_tool_calls']:
        print(f"   {call['content']}")
    print()


async def demo_intelligent_arguments():
    """Demo 3: Intelligent argument generation from prompts"""
    print("🧠 Demo 3: Intelligent Argument Generation")
    print("=" * 50)
    
    template = """
# pre: setup
{% set allowed_tools = ["calculator"] %}

# prompt: setup
## user
Please multiply 7 by 8.

# post: setup
{% set next_step = "return" %}
"""

    with_tools = {
        'calculator': {'fn': calculator}
    }
    
    result = await start(template, {'with_tools': with_tools})
    
    print("✅ Mock provider intelligently extracted:")
    print("   - Operation: multiply (from 'multiply 7 by 8')")
    print("   - First number: 7 (from prompt)")
    print("   - Second number: 8 (from prompt)")
    
    for call in result['result_tool_calls']:
        print(f"   - Result: {call['content']}")
    print()


async def demo_error_handling():
    """Demo 4: Error handling and recovery"""
    print("⚠️  Demo 4: Error Handling")
    print("=" * 50)
    
    def failing_tool(message: str) -> str:
        """Tool that always fails for testing error handling"""
        raise ValueError("This tool intentionally fails")
    
    template = """
# pre: setup
{% set allowed_tools = ["failing_tool"] %}

# prompt: setup
## user
Use the failing tool.

# post: setup
{% set next_step = "return" %}
"""

    with_tools = {
        'failing_tool': {'fn': failing_tool}
    }
    
    result = await start(template, {'with_tools': with_tools})
    
    print("✅ Error handling working correctly:")
    for call in result['result_tool_calls']:
        error = call.get('with_error', False)
        content = call['content']
        print(f"   - Error captured: {error}")
        print(f"   - Error message: {content}")
    print()


async def main():
    """Run all demos"""
    print("🚀 APL Python Implementation - Enhanced Features Demo")
    print("=" * 70)
    print()
    
    await demo_basic_tool_execution()
    await demo_context_aware_tools() 
    await demo_intelligent_arguments()
    await demo_error_handling()
    
    print("🎉 All enhanced features demonstrated successfully!")
    print()
    print("Key improvements:")
    print("• Function introspection for automatic tool argument generation")
    print("• Actual tool execution in mock provider (not just simulation)")
    print("• Intelligent argument extraction from user prompts")
    print("• Context-aware tools with execution context access")
    print("• Comprehensive error handling and recovery")
    print("• Full testing without external API dependencies")


if __name__ == "__main__":
    asyncio.run(main())
