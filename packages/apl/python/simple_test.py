#!/usr/bin/env python3
"""
Simple test to verify key fixes
"""

import sys
import os
import asyncio

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from defuss_apl import start
from defuss_apl.tools import validate_schema

async def main():
    print("Testing key fixes...")
    
    # Test 1: JSON helper function
    print("1. Testing JSON helper function...")
    template = """
# pre: test
{% set data = {"user": {"name": "Alice"}} %}
{% set name = get_json_path(data, "user.name", "unknown") %}

# prompt: test
## user
Hello {{ name }}
"""
    
    context = await start(template, {"debug": False})
    name = context.get("name")
    print(f"   Extracted name: {name}")
    assert name == "Alice", f"Expected 'Alice', got '{name}'"
    print("   ✓ JSON helper works")
    
    # Test 2: Schema validation
    print("2. Testing schema validation...")
    schema = {
        "type": "object", 
        "properties": {"name": {"type": "string"}},
        "required": ["name"]
    }
    
    # Valid data
    ctx = {"errors": [], "output_structure": schema}
    result = validate_schema({"name": "test"}, ctx)
    assert result == True, "Valid data should pass"
    
    # Invalid data
    ctx = {"errors": [], "output_structure": schema}
    result = validate_schema({"age": 30}, ctx)
    assert result == False, "Invalid data should fail"
    assert len(ctx["errors"]) > 0, "Should have validation errors"
    print("   ✓ Schema validation works")
    
    # Test 3: Attachment processing
    print("3. Testing attachment processing...")
    template = """
# prompt: test
## user
Image:
@image_url https://example.com/test.jpg
Text after
"""
    
    context = await start(template, {"debug": False})
    prompts = context.get("prompts", [])
    content = prompts[0]["content"] if prompts else None
    
    if isinstance(content, list):
        has_text = any(p.get("type") == "text" for p in content)
        has_image = any(p.get("type") == "image_url" for p in content)
        assert has_text and has_image, "Should have both text and image parts"
        print("   ✓ Attachment processing works")
    else:
        print(f"   ✗ Expected list content, got: {type(content)}")
        return False
    
    print("\n🎉 All key fixes verified!")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
