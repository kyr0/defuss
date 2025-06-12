#!/usr/bin/env python3
"""
Sum Accumulator Example using add_context()

This example demonstrates:
- Using add_context() to sum numbers from a list
- Safe variable initialization with defaults
- Processing arrays in iterative workflows
"""

import asyncio
import sys
import os

# Add the parent directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from defuss_apl import start


async def run_sum_example():
    """Sum numbers from a list using add_context()"""
    
    print("=== Sum Accumulator Example ===")
    print("Using add_context() to sum numbers: [10, 20, 30, 40, 50]")
    print()
    
    template = """
# pre: sum_loop
{% if get_context('numbers') is none %}
{{ set_context('numbers', [10, 20, 30, 40, 50]) }}
{{ set_context('index', 0) }}
{% endif %}
{% set current_number = get_context('numbers', [])[get_context('index', 0)] %}
{{ add_context('total', current_number, 0) }}
{{ inc_context('index') }}

# prompt: sum_loop
## user
Added {{ current_number }} to running total. Current sum: {{ get_context('total', 0) }}

# post: sum_loop
{% if get_context('index', 0) < get_context('numbers', [])|length %}
{{ set_context('next_step', 'sum_loop') }}
{% else %}
{{ set_context('next_step', 'result') }}
{% endif %}

# prompt: result
## user
Final sum: {{ get_context('total', 0) }}
All numbers processed successfully!
"""
    
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
        print("   - add_context('total', value, 0) initializes total to 0 on first use")
        print("   - Each call adds the new value to the accumulator")
        print("   - Safe array access with get_context() and defaults")
        print("   - Iterative processing with explicit termination")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(run_sum_example())
