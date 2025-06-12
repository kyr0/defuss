#!/usr/bin/env python3
"""
Simple Counter Example using inc_context()

This example demonstrates:
- Using inc_context() to increment a counter
- Explicit termination behavior
- Loop control with conditional next_step
"""

import asyncio
import sys
import os

# Add the parent directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from defuss_apl import start


async def run_counter_example():
    """Simple counter that increments until it reaches 5"""
    
    print("=== Simple Counter Example ===")
    print("Using inc_context() to create a counter that increments until 5")
    print()
    
    template = """
# pre: increment
{{ inc_context('counter') }}

# prompt: increment
## user
Counter is now: {{ get_context('counter', 0) }}

# post: increment
{% if get_context('counter', 0) < 5 %}
{{ set_context('next_step', 'increment') }}
{% else %}
{{ set_context('next_step', 'finish') }}
{% endif %}

# prompt: finish
## user
Final counter value: {{ get_context('counter', 0) }}
Process completed!
"""
    
    try:
        context = await start(template, {'debug': False})
        
        print(f"✅ Counter finished at: {context['counter']}")
        print(f"📊 Total steps executed: {len(context['context_history'])}")
        print(f"🔄 Total runs: {context['global_runs']}")
        print()
        print("📝 This example shows:")
        print("   - inc_context() automatically initializes counter to 0 on first use")
        print("   - Each call to inc_context('counter') adds 1 to the current value")
        print("   - Loop continues until counter reaches 5, then explicitly terminates")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(run_counter_example())
