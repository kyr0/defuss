#!/usr/bin/env python3
"""
Debug Control Flow - Simple Test

Test basic set_context functionality within conditionals.
"""

import asyncio
import os
from defuss_apl import start


def load_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as f:
        return f.read()


async def main():
    """Debug control flow execution"""
    print("=== Debug Control Flow ===")
    print("Testing set_context in conditionals")
    print()
    
    # Load the template from external .apl file
    template_path = os.path.join(os.path.dirname(__file__), "debug_control_flow.apl")
    template = load_template(template_path)
    
    print("📝 Template:")
    print(template)
    
    result = await start(template, {"debug": True})
    
    print("✅ Results:")
    print(f"Final counter: {result.get('counter')}")
    print(f"Total steps executed: {result['global_runs']}")
    print(f"Final response: {result['result_text']}")
    
    # Show step progression
    print(f"\nStep progression:")
    for i, context in enumerate(result.get('context_history', [])):
        step = context.get('current_step', 'unknown')
        counter = context.get('counter', 0)
        next_step = context.get('next_step', 'none')
        print(f"   Step {i+1}: {step} (counter: {counter}, next: {next_step})")


if __name__ == "__main__":
    asyncio.run(main())
