#!/usr/bin/env python3
"""
String Building Example using add_context()

This example demonstrates:
- Loading templates from .apl files
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


def load_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as f:
        return f.read()


async def run_string_builder_example():
    """Build strings using add_context()"""
    
    print("=== String Builder Example ===")
    print("Using add_context() to build strings from word lists")
    print()
    
    # Load template from .apl file
    template_path = os.path.join(os.path.dirname(__file__), "string_builder.apl")
    template = load_template(template_path)
    
    try:
        context = await start(template, {'debug': False})
        
        sentence = context.get('sentence', '')
        word_list = context.get('word_list', [])
        char_count = context.get('char_count', 0)
        
        print(f"✅ String building completed!")
        print(f"📝 Final sentence: \"{sentence}\"")
        print(f"📊 Words processed: {word_list}")
        print(f"🔤 Character count: {char_count}")
        print(f"📏 Final sentence length: {len(sentence)}")
        print()
        print("📝 This example shows:")
        print("   - Loading templates from .apl files")
        print("   - add_context(key, value, '') for string initialization")
        print("   - add_context(key, value) for string concatenation")
        print("   - add_context(key, [item], []) for list building")
        print("   - add_context(key, number) for numeric accumulation")
        print("   - Multi-step workflow with explicit termination")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(run_string_builder_example())
