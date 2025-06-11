#!/usr/bin/env python3
"""
Comprehensive compliance test for APL implementation against specification v1.1
"""

import asyncio
import sys
import os
import json

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from defuss_apl import parse_apl, start
from defuss_apl.test_utils import create_mock_provider
from defuss_apl.parser import ValidationError
from defuss_apl.tools import describe_tools, call_tools, validate_schema


def test_step_heading_validation():
    """Test §1.1 Step Heading validation"""
    print("Testing §1.1 Step Heading validation...")
    
    # Test reserved identifier
    try:
        parse_apl("# prompt: return\nTest")
        return False, "Should reject reserved identifier 'return'"
    except ValidationError as e:
        if "Reserved step identifier: return" not in str(e):
            return False, f"Wrong error message: {e}"
    
    # Test duplicate identifiers
    try:
        parse_apl("# pre: test\n# prompt: test\n# pre: test\n")
        return False, "Should reject duplicate step identifiers"
    except ValidationError as e:
        if "Duplicate step identifier" not in str(e):
            return False, f"Wrong error message: {e}"
    
    # Test invalid identifier with colons/hashes
    try:
        parse_apl("# prompt: test:name\nTest")
        return False, "Should reject identifier with colon"
    except ValidationError as e:
        if "Invalid step identifier" not in str(e):
            return False, f"Wrong error message: {e}"
    
    # Test Jinja in heading
    try:
        parse_apl("# prompt: {{ variable }}\nTest")
        return False, "Should reject Jinja in heading"
    except ValidationError as e:
        if "Invalid step heading" not in str(e):
            return False, f"Wrong error message: {e}"
    
    return True, "All step heading validation tests passed"


def test_role_concatenation():
    """Test §1.2 Role concatenation"""
    print("Testing §1.2 Role concatenation...")
    
    template = """
# prompt: test

## system
First system message.

## user
User message.

## system
Second system message.
"""
    
    steps = parse_apl(template)
    step = steps["test"]
    
    # Check if duplicate system roles are concatenated
    system_content = step.prompt.roles.get("system", "")
    if "First system message.\nSecond system message." not in system_content:
        return False, f"Role concatenation failed: {system_content}"
    
    return True, "Role concatenation works correctly"


async def test_attachment_processing():
    """Test §1.2.1 Attachment processing"""
    print("Testing §1.2.1 Attachment processing...")
    
    template = """
# prompt: test

## user
Here's an image:
@image_url https://example.com/image.jpg
And some text after.
"""
    
    context = await start(template, {"debug": False})
    prompts = context.get("prompts", [])
    
    if not prompts:
        return False, "No prompts generated"
    
    content = prompts[0]["content"]
    if not isinstance(content, list):
        return False, f"Expected list content for attachments, got: {type(content)}"
    
    # Should have text part and image part
    has_text = any(part.get("type") == "text" for part in content)
    has_image = any(part.get("type") == "image_url" for part in content)
    
    if not (has_text and has_image):
        return False, f"Missing text or image parts: {content}"
    
    return True, "Attachment processing works correctly"


async def test_variable_lifecycle():
    """Test §2.3 Variable lifecycle"""
    print("Testing §2.3 Variable lifecycle...")
    
    template = """
# pre: step1
{{ set_context('test_var', "step1") }}

# prompt: step1
## user
Test message 1

# post: step1
{{ set_context('next_step', "step2") }}

# pre: step2
{{ set_context('test_var', "step2") }}

# prompt: step2
## user
Test message 2
"""
    
    context = await start(template, {"debug": False})
    
    # Check that errors were reset between steps
    if context.get("errors"):
        return False, f"Errors not properly reset: {context['errors']}"
    
    # Check context history
    history = context.get("context_history", [])
    if len(history) < 2:
        return False, f"Context history not maintained: {len(history)} entries"
    
    return True, "Variable lifecycle works correctly"


def test_tool_calling():
    """Test §5 Tool calling"""
    print("Testing §5 Tool calling...")
    
    def calc(x: int, y: int) -> int:
        """Add two integers and return the sum."""
        return x + y
    
    # Test tool description generation
    context = {
        "with_tools": {
            "calc": {
                "fn": calc,
                "with_context": False
            }
        },
        "allowed_tools": ["calc"]
    }
    
    tools = describe_tools(context)
    
    if not tools:
        return False, "No tools generated"
    
    tool = tools[0]
    if tool["type"] != "function":
        return False, f"Wrong tool type: {tool['type']}"
    
    function_def = tool["function"]
    if function_def["name"] != "calc":
        return False, f"Wrong function name: {function_def['name']}"
    
    # Check parameters
    params = function_def["parameters"]
    if params["type"] != "object":
        return False, f"Wrong parameters type: {params['type']}"
    
    if "x" not in params["properties"] or "y" not in params["properties"]:
        return False, f"Missing parameters: {params['properties']}"
    
    if params["properties"]["x"]["type"] != "integer":
        return False, f"Wrong x type: {params['properties']['x']['type']}"
    
    return True, "Tool calling works correctly"


async def test_json_helper():
    """Test §7.4 JSON helper function"""
    print("Testing §7.4 JSON helper function...")
    
    template = """
# pre: test
{{ set_context('test_data', {"user": {"name": "Alice", "items": [1, 2, 3]}}) }}
{{ set_context('name', get_json_path(test_data, "user.name", "unknown")) }}
{{ set_context('missing', get_json_path(test_data, "user.missing", "default")) }}
{{ set_context('item', get_json_path(test_data, "user.items.1", "none")) }}

# prompt: test
## user
Name: {{ name }}, Missing: {{ missing }}, Item: {{ item }}
"""
    
    context = await start(template, {"debug": False})
    
    name = context.get("name")
    missing = context.get("missing") 
    item = context.get("item")
    
    if name != "Alice":
        return False, f"Wrong name extraction: {name}"
    
    if missing != "default":
        return False, f"Wrong default value: {missing}"
    
    if item != 2:  # items[1] should be 2
        return False, f"Wrong array access: {item}"
    
    return True, "JSON helper function works correctly"


def test_schema_validation():
    """Test schema validation"""
    print("Testing schema validation...")
    
    # Test basic schema validation
    schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age": {"type": "integer"}
        },
        "required": ["name"]
    }
    
    context = {"errors": [], "output_structure": schema}
    
    # Valid data
    valid_data = {"name": "John", "age": 30}
    result = validate_schema(valid_data, context)
    if not result:
        return False, f"Valid data rejected: {context['errors']}"
    
    # Invalid data - missing required field
    context = {"errors": [], "output_structure": schema}
    invalid_data = {"age": 30}
    result = validate_schema(invalid_data, context)
    if result:  # Should fail with basic validation
        return False, f"Invalid data accepted when it should fail. Errors: {context['errors']}"
    
    # Check that error was recorded
    if not context["errors"]:
        return False, "No validation errors recorded for invalid data"
    
    return True, "Schema validation works correctly"


async def test_error_handling():
    """Test error handling and messages"""
    print("Testing error handling...")
    
    # Test unknown step error
    template = """
# pre: step1
{{ set_context('next_step', "nonexistent") }}

# prompt: step1
## user
Test
"""
    
    try:
        await start(template, {"debug": False})
        return False, "Should have failed with unknown step"
    except Exception as e:
        if "Unknown step: nonexistent" not in str(e):
            return False, f"Wrong error message: {e}"
        
        return True, "Error handling works correctly"


async def main():
    """Run all compliance tests"""
    print("APL Implementation Compliance Test Suite")
    print("=" * 50)
    print("Testing against specification v1.1")
    print()
    
    # Sync tests
    sync_tests = [
        test_step_heading_validation,
        test_role_concatenation,
        test_tool_calling,
        test_schema_validation
    ]
    
    # Async tests - now these are actual async functions
    async_tests = [
        test_attachment_processing,
        test_variable_lifecycle,
        test_json_helper,
        test_error_handling
    ]
    
    passed = 0
    failed = 0
    
    # Run sync tests
    for test in sync_tests:
        try:
            success, message = test()
            if success:
                print(f"✓ {message}")
                passed += 1
            else:
                print(f"✗ {message}")
                failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} failed with exception: {e}")
            failed += 1
        print()
    
    # Run async tests
    for test in async_tests:
        try:
            success, message = await test()
            if success:
                print(f"✓ {message}")
                passed += 1
            else:
                print(f"✗ {message}")
                failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} failed with exception: {e}")
            failed += 1
        print()
    
    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! Implementation is compliant with APL specification v1.1")
        return True
    else:
        print("❌ Some tests failed. Implementation needs fixes.")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
