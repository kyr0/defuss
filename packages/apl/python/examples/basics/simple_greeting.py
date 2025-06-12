#!/usr/bin/env python3
"""
Simple Greeting Example

This example demonstrates:
- Basic APL template structure
- Variable assignment with set_context
- Simple prompt execution
- Loading templates from .apl files
"""

import asyncio
import os
from defuss_apl import start


def load_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as f:
        return f.read()


async def main():
    """Simple greeting example"""
    print("=== Simple Greeting Example ===")
    print("Demonstrates: Basic APL structure and variable assignment")
    print()
    
    # Load the template from external .apl file
    template_path = os.path.join(os.path.dirname(__file__), "simple_greeting.apl")
    template = load_template(template_path)
    
    print("📝 Template:")
    print(template)
    
    result = await start(template)
    
    print("✅ Results:")
    print(f"Response: {result['result_text']}")
    print(f"Runs: {result['global_runs']}")
    print()
    
    # Example with variables
    print("=== With Variables ===")
    
    # Load the template with variables from external .apl file
    template_with_vars_path = os.path.join(os.path.dirname(__file__), "simple_greeting_with_vars.apl")
    template_with_vars = load_template(template_with_vars_path)
    
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
    else:
        print("🔑 Using OpenAI as LLM provider (OPENAI_API_KEY is set)")


if __name__ == "__main__":
    asyncio.run(main())
