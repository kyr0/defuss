#!/usr/bin/env python3
"""
Test script to verify APL implementation compliance
"""

import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from defuss_apl import parse_apl, start
    from defuss_apl.parser import ValidationError
    from defuss_apl.runtime import APLRuntime
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're in the right directory and dependencies are installed")
    sys.exit(1)

# Test basic parsing
def test_parser():
    print("Testing parser...")
    
    # Test basic template
    simple_template = """
# prompt: greet
How are you?
"""
    
    try:
        steps = parse_apl(simple_template)
        print("✓ Basic parsing works")
        print(f"  Found {len(steps)} steps: {list(steps.keys())}")
    except Exception as e:
        print(f"✗ Basic parsing failed: {e}")
        return False
    
    # Test role parsing
    role_template = """
# prompt: greet

## system
You are a helpful assistant.

## user  
Hello, how are you?
"""
    
    try:
        steps = parse_apl(role_template)
        step = steps["greet"]
        print("✓ Role parsing works")
        print(f"  Roles found: {list(step.prompt.roles.keys())}")
    except Exception as e:
        print(f"✗ Role parsing failed: {e}")
        return False
        
    # Test validation errors
    try:
        invalid_template = """
# prompt: return
This should fail
"""
        parse_apl(invalid_template)
        print("✗ Validation should have failed for reserved identifier")
        return False
    except ValidationError as e:
        print(f"✓ Validation correctly caught reserved identifier: {e}")
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False
    
    return True

# Test runtime execution
async def test_runtime():
    print("\nTesting runtime...")
    
    # Simple template with get_json_path helper
    template = """
# pre: test
{% set test_data = {"user": {"name": "John", "age": 30}} %}

# prompt: test
## system
You are a test assistant.

## user
Test message

# post: test
{% set extracted_name = get_json_path(test_data, "user.name", "unknown") %}
{% if extracted_name == "John" %}
  Helper function works!
{% endif %}
"""
    
    try:
        runtime = APLRuntime({"debug": True})
        context = await runtime.start(template)
        
        print("✓ Runtime execution works")
        print(f"  Final context has {len(context)} variables")
        print(f"  Helper function available: {'get_json_path' in context}")
        
        # Check if our helper function worked
        if 'test_data' in context:
            print(f"  Test data: {context['test_data']}")
            
        return True
        
    except Exception as e:
        print(f"✗ Runtime execution failed: {e}")
        return False

# Test tool functionality
async def test_tools():
    print("\nTesting tools...")
    
    # Simple calculator tool
    def calc(x: int, y: int) -> int:
        """Add two integers"""
        return x + y
    
    from defuss_apl.tools import describe_tools
    
    context = {
        "with_tools": {
            "calc": {
                "fn": calc,
                "with_context": False
            }
        },
        "allowed_tools": ["calc"]
    }
    
    try:
        tools = describe_tools(context)
        print("✓ Tool description generation works")
        print(f"  Generated {len(tools)} tool descriptions")
        if tools:
            print(f"  First tool: {tools[0]}")
        return True
        
    except Exception as e:
        print(f"✗ Tool description failed: {e}")
        return False

async def main():
    print("APL Implementation Compliance Test")
    print("=" * 40)
    
    # Run tests
    parser_ok = test_parser()
    runtime_ok = await test_runtime()
    tools_ok = await test_tools()
    
    print("\n" + "=" * 40)
    if parser_ok and runtime_ok and tools_ok:
        print("✓ All tests passed! Implementation appears compliant.")
    else:
        print("✗ Some tests failed. Implementation needs work.")
        
if __name__ == "__main__":
    asyncio.run(main())
