#!/usr/bin/env python3
"""
Simple Greeting Example

This example demonstrates:
- Basic APL template structure
- Variable assignment with set_context
- Simple prompt execution
"""

import asyncio
import os
from defuss_apl import start


async def main():
    """Simple greeting example"""
    print("=== Simple Greeting Example ===")
    print("Demonstrates: Basic APL structure and variable assignment")
    print()
    
    template = """
# prompt: greet
Hello! How can I help you today?
"""
    
    print("📝 Template:")
    print(template)
    
    result = await start(template)
    
    print("✅ Results:")
    print(f"Response: {result['result_text']}")
    print(f"Runs: {result['global_runs']}")
    print()
    
    # Example with variables
    print("=== With Variables ===")
    
    template_with_vars = """
# pre: setup
{{ set_context('user_name', 'Alice') }}
{{ set_context('greeting', 'Hello') }}

# prompt: setup
## system
You are a friendly assistant.

## user
{{ greeting }}, {{ user_name }}! How are you doing today?

# post: setup
{{ set_context('next_step', 'return') }}
"""
    
    print("📝 Template with variables:")
    print(template_with_vars)
    
    result = await start(template_with_vars)
    
    print("✅ Results:")
    print(f"User name: {result.get('user_name')}")
    print(f"Greeting: {result.get('greeting')}")
    print(f"Response: {result['result_text']}")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock provider (set OPENAI_API_KEY for real LLM)")


if __name__ == "__main__":
    asyncio.run(main())
