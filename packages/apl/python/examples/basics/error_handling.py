#!/usr/bin/env python3
"""
Error Handling Example

This example demonstrates:
- Error detection and handling
- Retry logic with max attempts
- Error state management
- Circuit breaking patterns
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
    """Error handling and retry logic"""
    print("=== Error Handling Example ===")
    print("Demonstrates: Error detection, retry logic, circuit breaking")
    print()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("Note: Using mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    else:
        print("🔑 Using OpenAI as LLM provider (OPENAI_API_KEY is set)")
        
    # Basic error handling - load template from file
    template_basic_path = os.path.join(os.path.dirname(__file__), "error_handling_basic.apl")
    template_basic = load_template(template_basic_path)
    
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
    
    # Tool error handling - load template from file
    template_tools_path = os.path.join(os.path.dirname(__file__), "error_handling_tools.apl")
    template_tools = load_template(template_tools_path)
    
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
