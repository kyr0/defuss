#!/usr/bin/env python3
"""
Debug Control Flow - Simple Test

Test basic set_context functionality within conditionals.
"""

import asyncio
import os
from defuss_apl import start


async def main():
    """Debug control flow execution"""
    print("=== Debug Control Flow ===")
    print("Testing set_context in conditionals")
    print()
    
    template = """
# pre: test
{{ set_context('counter', 1) }}

# prompt: test
Starting with counter: {{ counter }}

# post: test
{{ set_context('counter', counter + 1) }}
Counter after increment: {{ counter }}
{% if counter >= 3 %}
Next step will be: final
{{ set_context('next_step', 'final') }}
{% else %}
Next step will be: test
{{ set_context('next_step', 'test') }}
{% endif %}

# prompt: final
Final step reached with counter: {{ counter }}

# post: final
{{ set_context('next_step', 'return') }}
"""
    
    print("📝 Template:")
    print(template)
    
    result = await start(template, {"debug": True})
    
    print("✅ Results:")
    print(f"Final counter: {result.get('counter')}")
    print(f"Total steps executed: {result['global_runs']}")
    print(f"Final response: {result['result_text']}")
    
    # Show step progression
    print(f"\nStep progression:")
    for i, context in enumerate(result.get('context_history', [])):
        step = context.get('current_step', 'unknown')
        counter = context.get('counter', 0)
        next_step = context.get('next_step', 'none')
        print(f"   Step {i+1}: {step} (counter: {counter}, next: {next_step})")


if __name__ == "__main__":
    asyncio.run(main())
