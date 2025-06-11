#!/usr/bin/env python3
"""
Control Flow Example

This example demonstrates:
- Multi-step workflows
- Control flow with next_step
- Loop-like behavior
- Variable tracking across steps
"""

import asyncio
import os
from defuss_apl import start


async def main():
    """Control flow and multi-step execution"""
    print("=== Control Flow Example ===")
    print("Demonstrates: Multi-step workflows, next_step control, loop behavior")
    print()
    
    template = """
# pre: first
{% if counter is not defined %}
    {{ set_context('counter', 1) }}
    {{ set_context('max_steps', 4) }}
{% endif %}

# prompt: first
This is step {{ counter }}. I'm executing the first step.

# post: first
{{ set_context('counter', counter + 1) }}
{% if counter <= max_steps %}
    {{ set_context('next_step', 'second') }}
{% else %}
    {{ set_context('next_step', 'final') }}
{% endif %}

# prompt: second
This is step {{ counter }}. I'm executing the second step.

# post: second
{{ set_context('counter', counter + 1) }}
{% if counter <= max_steps %}
    {{ set_context('next_step', 'first') }}
{% else %}
    {{ set_context('next_step', 'final') }}
{% endif %}

# prompt: final
This is the final step {{ counter }}. Workflow complete!

# post: final
{{ set_context('next_step', 'return') }}
"""
    
    print("📝 Template:")
    print(template)
    
    result = await start(template, {"debug": True, "max_runs": 15})
    
    print("✅ Results:")
    print(f"Final counter: {result.get('counter')}")
    print(f"Total steps executed: {result['global_runs']}")
    print(f"Final response: {result['result_text']}")
    
    # Show step progression
    print(f"\nStep progression:")
    for i, context in enumerate(result.get('context_history', [])):
        step = context.get('prev_step') or 'start'
        counter = context.get('counter', 0)
        print(f"   Step {i+1}: {step} (counter: {counter})")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock provider (set OPENAI_API_KEY for real LLM)")


if __name__ == "__main__":
    asyncio.run(main())
