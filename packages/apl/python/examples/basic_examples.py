"""
APL Python Examples

Run these examples to see APL in action.
"""

import asyncio
import os
from defuss_apl import start


async def example_simple():
    """Simple greeting example"""
    print("=== Simple Example ===")
    
    agent = """
# prompt: greet
Hello! How can I help you today?
"""
    
    result = await start(agent)
    print(f"Response: {result['result_text']}")
    print(f"Runs: {result['global_runs']}")
    print()


async def example_variables():
    """Example with variables and multi-phase"""
    print("=== Variables Example ===")
    
    agent = """
# pre: setup
{{ set_context('user_name', 'Alice') }}
{{ set_context('greeting', 'Hello') }}

# prompt: setup
## system
You are a friendly assistant.

## user
{{ get_context('greeting', 'Hello') }}, {{ get_context('user_name', 'User') }}! How are you doing today?

# post: setup
{{ set_context('next_step', 'return') }}
"""
    
    result = await start(agent)
    print(f"User name: {result.get('user_name')}")
    print(f"Greeting: {result.get('greeting')}")
    print(f"Response: {result['result_text']}")
    print()


async def example_control_flow():
    """Example with control flow and multiple steps"""
    print("=== Control Flow Example ===")
    
    agent = """
# pre: first
{{ set_context('counter', 1) }}

# prompt: first
This is step {{ get_context('counter', 0) }}.

# post: first
{{ set_context('counter', get_context('counter', 0) + 1) }}
{% if get_context('counter', 0) <= 3 %}
    {{ set_context('next_step', 'second') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}

# prompt: second
This is step {{ get_context('counter', 0) }}.

# post: second
{{ set_context('counter', get_context('counter', 0) + 1) }}
{% if get_context('counter', 0) <= 3 %}
    {{ set_context('next_step', 'first') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
"""
    
    result = await start(agent)
    print(f"Final counter: {result.get('counter')}")
    print(f"Total runs: {result['global_runs']}")
    print(f"Final response: {result['result_text']}")
    print()


async def example_tools():
    """Example with tool calling"""
    print("=== Tool Calling Example ===")
    
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
        return f"The weather in {city} is sunny with 22°C"
    
    agent = """
# pre: setup
{{ set_context('allowed_tools', ['calculator', 'get_weather']) }}

# prompt: setup
Please calculate 15 + 25, then multiply the result by 2. 
Also, what's the weather like in Paris?
"""
    
    options = {
        "with_tools": {
            "calculator": {"fn": calculator},
            "get_weather": {"fn": get_weather}
        }
    }
    
    result = await start(agent, options)
    print(f"Tools available: {len(result['tools'])}")
    print(f"Tool calls made: {len(result['result_tool_calls'])}")
    print(f"Response: {result['result_text']}")
    print()


async def example_multimodal():
    """Example with multimodal attachments"""
    print("=== Multimodal Example ===")
    
    agent = """
# prompt: vision
Please describe what you see in this image and analyze the document:

@image_url https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Sunrise.PNG/330px-Sunrise.PNG
@file https://example.com/sample.pdf

What insights can you provide?
"""
    
    result = await start(agent)
    print(f"Prompts created: {len(result['prompts'])}")
    
    # Check the prompt content structure
    if result['prompts']:
        content = result['prompts'][0]['content']
        if isinstance(content, list):
            print(f"Content parts: {len(content)}")
            for i, part in enumerate(content):
                if isinstance(part, dict):
                    print(f"  Part {i+1}: {part.get('type', 'unknown')}")
    
    print(f"Response: {result['result_text']}")
    print()


async def example_error_handling():
    """Example with error handling"""
    print("=== Error Handling Example ===")
    
    agent = """
# pre: setup
{{ set_context('max_retries', 2) }}

# prompt: setup
This is attempt #{{ get_context('runs', 0) + 1 }}. Please respond with something.

# post: setup
{% if errors and get_context('runs', 0) < get_context('max_retries', 2) %}
    {{ set_context('next_step', 'setup') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
"""
    
    result = await start(agent)
    print(f"Total runs: {result['global_runs']}")
    print(f"Errors: {result['errors']}")
    print(f"Response: {result['result_text']}")
    print()


async def main():
    """Run all examples"""
    print("APL Python Examples")
    print("=" * 50)
    print()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("Note: Using mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    
    await example_simple()
    await example_variables()
    await example_control_flow()
    await example_tools()
    await example_multimodal()
    await example_error_handling()
    
    print("All examples completed!")


if __name__ == "__main__":
    asyncio.run(main())
