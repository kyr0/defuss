#!/usr/bin/env python3
"""
Control Flow Example

This example demonstrates:
- Multi-step workflows
- Control flow with next_step
- Loop-like behavior
- Variable tracking across steps
- Loading templates from .apl files
"""

import asyncio
import os
from defuss_apl import start


def load_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as f:
        return f.read()


async def main():
    """Control flow and multi-step execution"""
    print("=== Control Flow Example ===")
    print("Demonstrates: Multi-step workflows, next_step control, loop behavior")
    print()

    if not os.getenv("OPENAI_API_KEY"):
        print("Note: Using mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    else:
        print("🔑 Using OpenAI as LLM provider (OPENAI_API_KEY is set)")

    # Load the template from external .apl file
    template_path = os.path.join(os.path.dirname(__file__), "control_flow.apl")
    template = load_template(template_path)
    
    print("📝 Template:")
    print(template)
    
    result = await start(template, {"debug": True, "max_runs": 15})
    
    print("✅ Results:")
    print(f"Final counter: {result.get('counter')}")
    print(f"Total steps executed: {result['global_runs']}")
    print(f"Final response: {result['result_text']}")
    
    # Show step progression
    print(f"\nStep progression:")
    for i, context in enumerate(result.get('context_history', [])):
        step = context.get('prev_step') or 'start'
        counter = context.get('counter', 0)
        print(f"   Step {i+1}: {step} (counter: {counter})")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock provider (set OPENAI_API_KEY for real LLM)")


if __name__ == "__main__":
    asyncio.run(main())
