#!/usr/bin/env python3
"""
Error Handling Example

This example demonstrates:
- Error detection and handling
- Retry logic with max attempts
- Error state management
- Circuit breaking patterns
"""

import asyncio
import os
from defuss_apl import start


async def main():
    """Error handling and retry logic"""
    print("=== Error Handling Example ===")
    print("Demonstrates: Error detection, retry logic, circuit breaking")
    print()
    
    # Basic error handling
    template_basic = """
# pre: setup
{{ set_context('max_retries', 2) }}

# prompt: setup
This is attempt #{{ get_context('runs', 0) + 1 }}. Please respond with something meaningful.

# post: setup
{% if errors and get_context('runs', 0) < get_context('max_retries', 2) %}
    {{ set_context('next_step', 'setup') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
"""
    
    print("📝 Basic Error Handling Template:")
    print(template_basic)
    
    result = await start(template_basic)
    
    print("✅ Basic Results:")
    print(f"Total runs: {result['global_runs']}")
    print(f"Errors: {result['errors']}")
    print(f"Max retries: {result.get('max_retries')}")
    print(f"Response: {result['result_text']}")
    print()
    
    # Error handling with tools
    def failing_tool(message: str) -> str:
        """Tool that sometimes fails"""
        if "fail" in message.lower():
            raise ValueError("Tool intentionally failed")
        return f"Successfully processed: {message}"
    
    template_tools = """
# pre: setup
{{ set_context('allowed_tools', ['failing_tool']) }}
{{ set_context('attempt', 1) }}

# prompt: setup
{% if get_context('attempt', 1) == 1 %}
Please use the failing tool with message "This should fail".
{% else %}
Please use the failing tool with message "This should work".
{% endif %}

# post: setup
{% if errors and get_context('attempt', 1) < 2 %}
    {{ set_context('attempt', get_context('attempt', 1) + 1) }}
    {{ set_context('next_step', 'setup') }}
{% else %}
    {{ set_context('next_step', 'return') }}
{% endif %}
"""
    
    print("📝 Tool Error Handling Template:")
    print(template_tools)
    
    options = {
        "with_tools": {
            "failing_tool": {"fn": failing_tool}
        }
    }
    
    result = await start(template_tools, options)
    
    print("✅ Tool Error Results:")
    print(f"Total runs: {result['global_runs']}")
    print(f"Final attempt: {result.get('attempt')}")
    print(f"Errors: {result['errors']}")
    
    if result['result_tool_calls']:
        print("Tool calls:")
        for call in result['result_tool_calls']:
            error = call.get('with_error', False)
            status = "ERROR" if error else "SUCCESS"
            print(f"   - {call['content']} ({status})")
    
    print(f"Final response: {result['result_text']}")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock provider (set OPENAI_API_KEY for real LLM)")


if __name__ == "__main__":
    asyncio.run(main())
