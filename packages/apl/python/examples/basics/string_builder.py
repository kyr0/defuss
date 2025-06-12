#!/usr/bin/env python3
"""
String Building Example using add_context()

This example demonstrates:
- Using add_context() for string concatenation
- Building strings piece by piece
- Multiple accumulator patterns in one workflow
"""

import asyncio
import sys
import os

# Add the parent directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from defuss_apl import start


async def run_string_builder_example():
    """Build strings using add_context()"""
    
    print("=== String Builder Example ===")
    print("Using add_context() to build strings from word lists")
    print()
    
    template = """
# pre: build_strings
{# Initialize data #}
{% if get_context('words') is none %}
{{ set_context('words', ['Hello', 'beautiful', 'world']) }}
{{ set_context('punctuation', ['!', '?', '.']) }}
{{ set_context('index', 0) }}
{% endif %}

{# Build sentence #}
{% set current_word = get_context('words', [])[get_context('index', 0)] %}
{% if get_context('index', 0) == 0 %}
{{ add_context('sentence', current_word, '') }}
{% else %}
{{ add_context('sentence', ' ') }}
{{ add_context('sentence', current_word) }}
{% endif %}

{# Build word list #}
{{ add_context('word_list', [current_word], []) }}

{# Count characters #}
{{ add_context('char_count', current_word|length) }}

{# Increment index #}
{{ inc_context('index') }}

# prompt: build_strings
## user
Processing word: "{{ current_word }}"
Current sentence: "{{ get_context('sentence', '') }}"
Words collected: {{ get_context('word_list', []) }}
Character count: {{ get_context('char_count', 0) }}

# post: build_strings
{% if get_context('index', 0) < get_context('words', [])|length %}
{{ set_context('next_step', 'build_strings') }}
{% else %}
{{ set_context('next_step', 'finalize') }}
{% endif %}

# prompt: finalize
## user
String building complete!

Final Results:
- Sentence: "{{ get_context('sentence', '') }}"
- All words: {{ get_context('word_list', []) }}
- Total characters: {{ get_context('char_count', 0) }}
- Word count: {{ get_context('word_list', [])|length }}

Now adding punctuation...

# post: finalize
{# Add random punctuation #}
{% set punct = get_context('punctuation', [])[0] %}
{{ add_context('sentence', punct) }}
{{ set_context('next_step', 'final_result') }}

# prompt: final_result
## user
Complete sentence with punctuation: "{{ get_context('sentence', '') }}"

Summary:
✓ Words processed: {{ get_context('word_list', [])|length }}
✓ Characters counted: {{ get_context('char_count', 0) }}
✓ Final sentence length: {{ get_context('sentence', '')|length }}
"""
    
    try:
        context = await start(template, {'debug': False})
        
        sentence = context.get('sentence', '')
        word_list = context.get('word_list', [])
        char_count = context.get('char_count', 0)
        
        print(f"✅ String building completed!")
        print(f"📝 Final sentence: '{sentence}'")
        print(f"📊 Words collected: {word_list}")
        print(f"🔢 Character count: {char_count}")
        print(f"📏 Final length: {len(sentence)}")
        print()
        print("📝 This example shows:")
        print("   - add_context() for string concatenation with empty string default")
        print("   - add_context() for list building with empty list default")
        print("   - add_context() for numeric accumulation (character counting)")
        print("   - Multiple accumulators working together in one workflow")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(run_string_builder_example())
