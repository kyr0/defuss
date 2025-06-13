#!/usr/bin/env python3
"""
Sum Accumulator Example using add()

This example demonstrates:
- Loading templates from .apl files
- Using add() to sum numbers from a list
- Safe variable initialization with defaults
- Processing arrays in iterative workflows
"""

import asyncio
import sys
import os

# Add the parent directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from defuss_apl import start


def load_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as f:
        return f.read()


async def run_sum_example():
    """Sum numbers from a list using add()"""
    
    print("=== Sum Accumulator Example ===")
    print("Using add() to sum numbers: [10, 20, 30, 40, 50]")
    print()

    if not os.getenv("OPENAI_API_KEY"):
        print("Note: Using mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    else:
        print("🔑 Using OpenAI as LLM provider (OPENAI_API_KEY is set)")
    
    # Load template from .apl file
    template_path = os.path.join(os.path.dirname(__file__), "sum_accumulator.apl")
    template = load_template(template_path)
    
    try:
        context = await start(template, {'debug': False})
        
        numbers = context.get('numbers', [])
        total = context.get('total', 0)
        expected = sum(numbers)
        
        print(f"✅ Sum completed!")
        print(f"📊 Numbers processed: {numbers}")
        print(f"🧮 Final total: {total}")
        print(f"✓ Expected total: {expected}")
        print(f"🎯 Match: {'Yes' if total == expected else 'No'}")
        print()
        print("📝 This example shows:")
        print("   - Loading templates from .apl files")
        print("   - add('total', value, 0) initializes total to 0 on first use")
        print("   - Each call adds the new value to the accumulator")
        print("   - Safe array access with get_context() and defaults")
        print("   - Iterative processing with explicit termination")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(run_sum_example())
