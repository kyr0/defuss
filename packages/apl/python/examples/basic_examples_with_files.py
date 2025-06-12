#!/usr/bin/env python3
"""
APL Python Examples using external .apl files

Run these examples to see APL with external template files in action.
"""

import asyncio
import os
from defuss_apl import start


def load_apl_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as file:
        return file.read()


async def example_simple():
    """Simple greeting example"""
    print("=== Simple Example ===")
    
    agent = load_apl_template(os.path.join(os.path.dirname(__file__), "simple_greeting.apl"))
    
    result = await start(agent)
    print(f"Response: {result['result_text']}")
    print(f"Runs: {result['global_runs']}")
    print()


async def example_variables():
    """Example with variables and multi-phase"""
    print("=== Variables Example ===")
    
    agent = load_apl_template(os.path.join(os.path.dirname(__file__), "variables_example.apl"))
    
    result = await start(agent)
    print(f"User name: {result.get('user_name')}")
    print(f"Greeting: {result.get('greeting')}")
    print(f"Response: {result['result_text']}")
    print()


async def example_control_flow():
    """Example with control flow and multiple steps"""
    print("=== Control Flow Example ===")
    
    agent = load_apl_template(os.path.join(os.path.dirname(__file__), "control_flow_example.apl"))
    
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
    
    agent = load_apl_template(os.path.join(os.path.dirname(__file__), "tools_example.apl"))
    
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
    
    agent = load_apl_template(os.path.join(os.path.dirname(__file__), "multimodal_example.apl"))
    
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
    
    agent = load_apl_template(os.path.join(os.path.dirname(__file__), "error_handling_example.apl"))
    
    result = await start(agent)
    print(f"Total runs: {result['global_runs']}")
    print(f"Errors: {result['errors']}")
    print(f"Response: {result['result_text']}")
    print()


async def main():
    """Run all examples"""
    print("APL Python Examples with External Template Files")
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
