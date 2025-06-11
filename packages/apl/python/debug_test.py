#!/usr/bin/env python3
"""
Debug specific discrepancies
"""

import sys
import os
import asyncio

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from defuss_apl import start
from defuss_apl.test_utils import create_echo_provider


async def debug_role_concatenation():
    """Debug role concatenation issue"""
    print("🔧 Debugging role concatenation...")
    
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
    
    print(f"Number of prompts: {len(prompts)}")
    for i, prompt in enumerate(prompts):
        print(f"  Prompt {i}: role={prompt['role']}, content='{prompt['content'][:50]}...'")
    
    # According to spec §1.2: "Duplicate role headings are concatenated in template order, 
    # separated by a newline. They become distinct messages in the final prompts list"
    # This means we should have 3 messages: system, user, system (not concatenated)
    
    system_messages = [p for p in prompts if p["role"] == "system"]
    print(f"System messages found: {len(system_messages)}")
    
    if len(system_messages) == 2:
        print("✓ Correct: Duplicate roles become distinct messages")
    else:
        print("✗ Incorrect: Should have 2 separate system messages")


async def debug_step_flow():
    """Debug step flow issue"""
    print("\n🔧 Debugging step flow...")
    
    template = """
# pre: step1
{% set test_var = "from_step1" %}

# prompt: step1
## user
Step 1 message

# post: step1
{% set next_step = "step2" %}

# pre: step2  
{% set previous_var = test_var %}
{% set test_var = "from_step2" %}

# prompt: step2
## user
Step 2: {{ test_var }}, Previous: {{ previous_var }}

# post: step2
{% if "Step 2: from_step2" in result_text %}
    {% set validation_passed = true %}
{% else %}
    {% set validation_passed = false %}
{% endif %}
"""
    
    result = await start(template, {
        "debug": True,
        "with_providers": {"gpt-4o": create_echo_provider()}
    })
    
    print(f"Result text: '{result.get('result_text')}'")
    print(f"Looking for: 'Step 2: from_step2'")
    print(f"Contains check: {'Step 2: from_step2' in result.get('result_text', '')}")
    print(f"test_var: {result.get('test_var')}")
    print(f"previous_var: {result.get('previous_var')}")
    print(f"validation_passed: {result.get('validation_passed')}")
    
    # Additional debug: check post phase execution
    errors = result.get('errors', [])
    print(f"Errors during execution: {errors}")
    
    # Check if the validation_passed variable was even set
    if 'validation_passed' not in result:
        print("WARNING: validation_passed variable was not set in post phase")
    else:
        print(f"validation_passed variable type: {type(result.get('validation_passed'))}")
        
    # Check all variables to see what's in the context
    print("\nAll context variables:")
    for key, value in result.items():
        if not key.startswith('_') and key not in ['context', 'context_history']:
            print(f"  {key}: {value} ({type(value)})")


if __name__ == "__main__":
    asyncio.run(debug_role_concatenation())
    asyncio.run(debug_step_flow())
