#!/usr/bin/env python3
"""
Example demonstrating APL relaxed syntax mode with external template files.

This example shows how to use the simplified relaxed syntax for pre/post phases
while maintaining full Jinja2 syntax in prompt phases.
"""

import asyncio
import os
from defuss_apl import start


def load_apl_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as file:
        return file.read()


async def main():
    """Run the relaxed syntax example"""
    
    # Load traditional Jinja APL syntax template
    traditional_template = load_apl_template(os.path.join(os.path.dirname(__file__), "traditional_syntax.apl"))

    # Load relaxed APL-Jinja syntax template
    relaxed_template = load_apl_template(os.path.join(os.path.dirname(__file__), "relaxed_syntax.apl"))

    print("=== Traditional Syntax Example ===")
    result1 = await start(traditional_template)
    print(f"User: {result1['user_name']}")
    print(f"Result: {result1['result_text']}")
    print(f"Runs: {result1['global_runs']}")
    
    print("\n=== Relaxed Syntax Example ===")
    result2 = await start(relaxed_template, {"relaxed": True})
    print(f"User: {result2['user_name']}")
    print(f"Result: {result2['result_text']}")
    print(f"Runs: {result2['global_runs']}")
    
    print("\n=== Comparison ===")
    print("Both examples produce identical results!")
    print("Relaxed syntax is more concise for pre/post phases.")


if __name__ == "__main__":
    asyncio.run(main())
