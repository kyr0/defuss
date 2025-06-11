#!/usr/bin/env python3
"""
Comprehensive test to identify implementation discrepancies
"""

import sys
import os
import asyncio
import json

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from defuss_apl import start
from defuss_apl.test_utils import create_echo_provider, check
from defuss_apl.tools import validate_schema
from defuss_apl.parser import ValidationError


async def test_discrepancies():
    """Test for potential discrepancies between implementation and spec"""
    print("🔍 Testing for implementation discrepancies...")
    print()
    
    # Test 1: Check that step flow follows specification exactly
    print("1. Testing step flow...")
    template = """
# pre: step1
{% set test_var = "from_step1" %}

# prompt: step1
## user
Step 1 message

# post: step1
{% set next_step = "step2" %}

# pre: step2  
{% set test_var = "from_step2" %}

# prompt: step2
## user
Step 2: {{ test_var }}

# post: step2
{% if "Step 2: from_step2" in result_text %}
    {% set validation_passed = true %}
{% else %}
    {% set validation_passed = false %}
{% endif %}
"""
    
    result = await start(template, {
        "debug": False,
        "with_providers": {"gpt-4o": create_echo_provider()}
    })
    print(f"   Step flow: {'✓' if result.get('validation_passed') else '✗'}")
    
    # Test 2: Check error lifecycle  
    print("2. Testing error lifecycle (§2.3)...")
    template = """
# pre: step1
{% set errors = ["injected_error"] %}

# prompt: step1  
## user
Test

# post: step1
{% set errors_in_post = errors %}
{% set next_step = "step2" %}

# pre: step2
{% set errors_in_pre = errors %}

# prompt: step2
## user  
Test 2
"""
    
    result = await start(template, {"debug": False})
    # Errors should be reset before each prompt phase
    print(f"   Error reset: {'✓' if not result.get('errors') else '✗'}")
    
    # Test 3: Check context history is maintained
    print("3. Testing context history (§2.4)...")
    history = result.get("context_history", [])
    print(f"   Context history entries: {len(history)}")
    print(f"   Context history maintained: {'✓' if len(history) >= 2 else '✗'}")
    
    # Test 4: Check all executor-maintained variables are present
    print("4. Testing executor-maintained variables (§2.4)...")
    required_vars = [
        "prev_step", "next_step", "result_text", "result_json", "result_tool_calls",
        "result_image_urls", "result_audio_inputs", "result_files", "result_role",
        "usage", "runs", "global_runs", "time_elapsed", "time_elapsed_global",
        "errors", "prompts", "tools", "context", "context_history"
    ]
    
    missing_vars = [var for var in required_vars if var not in result]
    if missing_vars:
        print(f"   ✗ Missing variables: {missing_vars}")
    else:
        print(f"   ✓ All executor variables present")
    
    # Test 5: Check user-settable variables have correct defaults
    print("5. Testing user-settable variables (§2.5)...")
    expected_defaults = {
        "model": "gpt-4o",
        "temperature": None,
        "allowed_tools": [],
        "output_mode": None,
        "output_structure": None,
        "max_tokens": None,
        "top_p": None,
        "presence_penalty": None,
        "frequency_penalty": None,
        "top_k": None,
        "repetition_penalty": None,
        "stop_sequences": [],
        "seed": None,
        "logit_bias": {},
    }
    
    template = "# prompt:\nTest"
    result = await start(template)
    
    wrong_defaults = []
    for var, expected in expected_defaults.items():
        if result.get(var) != expected:
            wrong_defaults.append(f"{var}: got {result.get(var)}, expected {expected}")
    
    if wrong_defaults:
        print(f"   ✗ Wrong defaults: {wrong_defaults}")
    else:
        print(f"   ✓ All default values correct")
    
    # Test 6: Test role concatenation (§1.2)
    print("6. Testing role concatenation (§1.2)...")
    template = """
# prompt: test
## system
First system message.
## user  
User message.
## system
Second system message.
"""
    
    result = await start(template, {"debug": False})
    prompts = result.get("prompts", [])
    
    # Should have 3 separate messages (not concatenated)
    system_messages = [p for p in prompts if p["role"] == "system"]
    print(f"   Role concatenation: {'✓' if len(system_messages) == 2 else '✗'} ({len(system_messages)} system messages)")
    
    # Test 7: Test attachment processing accuracy
    print("7. Testing attachment processing (§1.2.1)...")
    template = """
# prompt: test
## user
Text before
@image_url https://example.com/test.jpg
Text after
@audio_input https://example.com/test.mp3
More text
"""
    
    result = await start(template, {"debug": False})
    prompts = result.get("prompts", [])
    
    if prompts:
        content = prompts[0].get("content", [])
        if isinstance(content, list):
            text_parts = [p for p in content if p.get("type") == "text"]
            image_parts = [p for p in content if p.get("type") == "image_url"]
            audio_parts = [p for p in content if p.get("type") == "audio_input"]
            
            print(f"   Text parts: {len(text_parts)}")
            print(f"   Image parts: {len(image_parts)}")  
            print(f"   Audio parts: {len(audio_parts)}")
            print(f"   Attachment processing: {'✓' if len(image_parts) == 1 and len(audio_parts) == 1 else '✗'}")
        else:
            print(f"   ✗ Expected list content, got: {type(content)}")
    
    # Test 8: Test JSON helper function edge cases
    print("8. Testing JSON helper function edge cases...")
    template = """
# pre: test
{% set data = {"a": {"b": [1, 2, {"c": "value"}]}} %}
{% set nested_array = get_json_path(data, "a.b.2.c", "default") %}
{% set missing_path = get_json_path(data, "x.y.z", "fallback") %}
{% set array_index = get_json_path(data, "a.b.1", "none") %}

# prompt: test
## user
Test: {{ nested_array }}, {{ missing_path }}, {{ array_index }}
"""
    
    result = await start(template, {"debug": False})
    
    nested_correct = result.get("nested_array") == "value"
    missing_correct = result.get("missing_path") == "fallback"
    array_correct = result.get("array_index") == 2
    
    print(f"   Nested access: {'✓' if nested_correct else '✗'}")
    print(f"   Missing path: {'✓' if missing_correct else '✗'}")
    print(f"   Array index: {'✓' if array_correct else '✗'}")
    
    # Test 9: Test reserved variable detection
    print("9. Testing reserved variable detection...")
    
    try:
        check("# pre: test\n{% set next_steps = [] %}\n# prompt: test\nTest")
        print("   ✗ Should have rejected reserved variable 'next_steps'")
    except ValidationError as e:
        if "Reserved variable: next_steps" in str(e):
            print("   ✓ Reserved variable detection works")
        else:
            print(f"   ✗ Wrong error message: {e}")
    except Exception as e:
        print(f"   ✗ Unexpected error: {e}")
    
    print()
    print("🎯 Discrepancy analysis complete")


if __name__ == "__main__":
    asyncio.run(test_discrepancies())
