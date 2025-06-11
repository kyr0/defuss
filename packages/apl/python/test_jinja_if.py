#!/usr/bin/env python3
"""
Test Jinja if statement parsing
"""

import sys
import os
import asyncio

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from defuss_apl import start
from defuss_apl.test_utils import create_echo_provider


async def test_simple_if():
    """Test simple if statement"""
    print("🔧 Testing simple if statement...")
    
    template = """
# prompt: test
## user
Hello world

# post: test
{% set test_string = "Hello world" %}
{% if "Hello" in test_string %}
    {% set condition_met = true %}
{% else %}
    {% set condition_met = false %}
{% endif %}
"""
    
    result = await start(template, {
        "debug": True,
        "with_providers": {"gpt-4o": create_echo_provider()}
    })
    
    print(f"test_string: '{result.get('test_string')}'")
    print(f"condition_met: {result.get('condition_met')}")
    print(f"result_text: '{result.get('result_text')}'")


async def test_result_text_if():
    """Test if statement with result_text"""
    print("\n🔧 Testing if statement with result_text...")
    
    template = """
# prompt: test
## user
Test message

# post: test
{% if "Test" in result_text %}
    {% set found_test = true %}
{% else %}
    {% set found_test = false %}
{% endif %}
"""
    
    result = await start(template, {
        "debug": True,
        "with_providers": {"gpt-4o": create_echo_provider()}
    })
    
    print(f"result_text: '{result.get('result_text')}'")
    print(f"found_test: {result.get('found_test')}")
    print(f"Contains 'Test': {'Test' in result.get('result_text', '')}")


if __name__ == "__main__":
    asyncio.run(test_simple_if())
    asyncio.run(test_result_text_if())
