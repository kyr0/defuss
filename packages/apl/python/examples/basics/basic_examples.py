"""
APL Python Examples - Organized Collection

This file provides a quick overview and runner for the organized APL examples.
All examples now use the new set_context syntax instead of {% set %}.

For individual examples, see:
- simple_greeting.py - Basic APL structure and variables
- calculator_demo.py - Tool calling and function introspection  
- control_flow.py - Multi-step workflows and next_step control
- error_handling.py - Error detection, retry logic, and recovery

To run all examples: python ../run_all.py
"""

import asyncio
import os
from defuss_apl import start


def load_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as f:
        return f.read()


async def example_overview():
    """Quick overview of APL capabilities"""
    print("=== APL Python - Quick Overview ===")
    print("Demonstrates: Core APL features with new set_context syntax")
    print()
    
    # Load template from .apl file
    template_path = os.path.join(os.path.dirname(__file__), "basic_examples.apl")
    template = load_template(template_path)
    
    print("📝 New set_context syntax example:")
    print(template)
    
    result = await start(template)
    
    print("✅ Results:")
    print(f"Framework: {result.get('framework')}")
    print(f"Version: {result.get('version')}")
    print(f"Syntax: {result.get('syntax')}")
    print(f"Demo complete: {result.get('demo_complete')}")
    print(f"Response: {result['result_text']}")
    print()
    
    print("📁 Organized Examples Structure:")
    print("   basics/")
    print("   ├── simple_greeting.py    - Basic APL structure")
    print("   ├── calculator_demo.py    - Tool calling")  
    print("   ├── control_flow.py       - Multi-step workflows")
    print("   └── error_handling.py     - Error recovery")
    print("   advanced/")
    print("   ├── enhanced_features.py  - Function introspection")
    print("   ├── json_processing.py    - Data extraction") 
    print("   └── complex_workflow.py   - Decision trees")
    print("   integrations/")
    print("   ├── multimodal_content.py - Images & files")
    print("   └── api_integration.py    - External APIs")
    print()
    
    print("🚀 To explore:")
    print("   python simple_greeting.py    # Start here")
    print("   python calculator_demo.py    # Tool usage")
    print("   python ../run_all.py         # Run everything")


# Legacy examples with updated syntax (now organized separately)
async def example_simple():
    """Simple greeting example - see simple_greeting.py"""
    print("👉 See basics/simple_greeting.py for detailed simple examples")


async def example_variables():
    """Variables example - see simple_greeting.py"""  
    print("👉 See basics/simple_greeting.py for variable usage examples")


async def example_control_flow():
    """Control flow example - see control_flow.py"""
    print("👉 See basics/control_flow.py for control flow examples")


async def example_tools():
    """Tool example - see calculator_demo.py"""
    print("👉 See basics/calculator_demo.py for tool calling examples")


async def example_multimodal():
    """Multimodal example - see multimodal_content.py"""
    print("👉 See integrations/multimodal_content.py for multimodal examples")


async def example_error_handling():
    """Error handling example - see error_handling.py"""
    print("👉 See basics/error_handling.py for error handling examples")


async def main():
    """Run overview and show organized structure"""
    print("APL Python Examples - Organized Structure")
    print("=" * 50)
    print()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("Note: Using mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    else:
        print("🔑 Using OpenAI as LLM provider (OPENAI_API_KEY is set)")
    
    await example_overview()
    
    print("📖 Legacy function references (now organized):")
    await example_simple()
    await example_variables() 
    await example_control_flow()
    await example_tools()
    await example_multimodal()
    await example_error_handling()
    
    print()
    print("✨ All examples updated to use set_context syntax!")
    print("   Old: {% set var = 'value' %}")
    print("   New: {{ set('var', 'value') }}")


if __name__ == "__main__":
    asyncio.run(main())
