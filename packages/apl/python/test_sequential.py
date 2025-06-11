#!/usr/bin/env python3
"""
Test sequential execution of set_context
"""

import asyncio
from defuss_apl import start


async def main():
    """Test sequential variable updates"""
    print("=== Testing Sequential set_context ===")
    
    template = """
# pre: test
{{ set_context('counter', 1) }}

# prompt: test
Initial counter: {{ counter }}

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
Final counter: {{ counter }}

# post: final
{{ set_context('next_step', 'return') }}
"""
    
    print("Template:")
    print(template)
    print()
    
    result = await start(template, {"debug": True})
    
    print(f"\n✅ Results:")
    print(f"Final counter: {result.get('counter')}")
    print(f"Total runs: {result['global_runs']}")
    print(f"Final response: {result['result_text']}")


if __name__ == "__main__":
    asyncio.run(main())
