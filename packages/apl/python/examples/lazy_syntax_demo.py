#!/usr/bin/env python3
"""
Example demonstrating APL lazy syntax mode.

This example shows how to use the simplified lazy syntax for pre/post phases
while maintaining full Jinja2 syntax in prompt phases.
"""

import asyncio
from defuss_apl import start


async def main():
    """Run the lazy syntax example"""
    
    # Traditional Jinja APL syntax
    traditional_template = """
# pre: greet
{{ set_context('user_name', 'Alice') }}
{{ set_context('greeting', 'Hello') }}

# prompt: greet
## system
You are a friendly assistant.

## user
{{ greeting }}, {{ user_name }}! How are you today?

# post: greet
{% if "good" in result_text.lower() %}
    {{ set_context('next_step', 'return') }}
{% else %}
    {{ set_context('retry_count', get_context('retry_count', 0) + 1) }}
    {% if get_context('retry_count', 0) < 3 %}
        {{ set_context('next_step', 'greet') }}
    {% else %}
        {{ set_context('next_step', 'return') }}
    {% endif %}
{% endif %}
"""

    # Lazy APL-Jinja syntax (requires lazy: true option)
    lazy_template = """
# pre: greet
set_context('user_name', 'Alice')
set_context('greeting', 'Hello')

# prompt: greet
## system
You are a friendly assistant.

## user
{{ greeting }}, {{ user_name }}! How are you today?

# post: greet
if "good" in result_text.lower()
    set_context('next_step', 'return')
else
    set_context('retry_count', get_context('retry_count', 0) + 1)
    if get_context('retry_count', 0) < 3
        set_context('next_step', 'greet')
    else
        set_context('next_step', 'return')
    endif
endif
"""

    print("=== Traditional Syntax Example ===")
    result1 = await start(traditional_template)
    print(f"User: {result1['user_name']}")
    print(f"Result: {result1['result_text']}")
    print(f"Runs: {result1['global_runs']}")
    
    print("\n=== Lazy Syntax Example ===")
    result2 = await start(lazy_template, {"lazy": True})
    print(f"User: {result2['user_name']}")
    print(f"Result: {result2['result_text']}")
    print(f"Runs: {result2['global_runs']}")
    
    print("\n=== Comparison ===")
    print("Both examples produce identical results!")
    print("Lazy syntax is more concise for pre/post phases.")


if __name__ == "__main__":
    asyncio.run(main())
