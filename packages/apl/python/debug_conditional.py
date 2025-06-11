#!/usr/bin/env python3
"""
Debug the specific conditional assignment issue
"""

import sys
import os
import asyncio

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from defuss_apl import start
from defuss_apl.test_utils import create_echo_provider


async def debug_conditional_assignment():
    """Debug the conditional assignment issue in isolation"""
    print("🔧 Debugging conditional assignment...")
    
    template = """
# pre: test
{% set result_text = "Step 2: from_step2, Previous: from_step1" %}

# prompt: test
## user
Test message

# post: test
Debug: result_text = '{{ result_text }}'
Debug: Contains check = {{ "Step 2: from_step2" in result_text }}
{% if "Step 2: from_step2" in result_text %}
Debug: Condition is TRUE
{% set validation_passed = true %}
{% else %}
Debug: Condition is FALSE  
{% set validation_passed = false %}
{% endif %}
Debug: After conditional, validation_passed should be set
"""
    
    result = await start(template, {
        "debug": True,
        "with_providers": {"gpt-4o": create_echo_provider()}
    })
    
    print(f"result_text: '{result.get('result_text')}'")
    print(f"validation_passed: {result.get('validation_passed')}")
    print(f"Errors: {result.get('errors')}")


if __name__ == "__main__":
    asyncio.run(debug_conditional_assignment())
