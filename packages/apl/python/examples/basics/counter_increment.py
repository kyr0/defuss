#!/usr/bin/env python3
"""
Simple Counter Example using inc()

This example demonstrates:
- Loading templates from .apl files
- Using inc() to increment a counter
- Explicit termination behavior
- Loop control with conditional next_step
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


async def run_counter_example():
    """Simple counter that increments until it reaches 5"""
    
    print("=== Simple Counter Example ===")
    print("Using inc() to create a counter that increments until 5")
    print()

    if not os.getenv("OPENAI_API_KEY"):
        print("Note: Using mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    else:
        print("🔑 Using OpenAI as LLM provider (OPENAI_API_KEY is set)")
    
    # Load template from .apl file
    template_path = os.path.join(os.path.dirname(__file__), "counter_increment.apl")
    template = load_template(template_path)
    
    try:
        context = await start(template, {'debug': False})
        
        print(f"✅ Counter finished at: {context['counter']}")
        print(f"📊 Total steps executed: {len(context['context_history'])}")
        print(f"🔄 Total runs: {context['global_runs']}")
        print()
        print("📝 This example shows:")
        print("   - Loading templates from .apl files")
        print("   - inc() automatically initializes counter to 0 on first use")
        print("   - Each call to inc('counter') adds 1 to the current value")
        print("   - Loop continues until counter reaches 5, then explicitly terminates")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    asyncio.run(run_counter_example())
