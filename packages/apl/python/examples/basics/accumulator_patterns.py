#!/usr/bin/env python3
"""
Comprehensive Accumulator Patterns Example

This example demonstrates all accumulator helper functions:
- Loading templates from .apl files
- inc_context() for counting
- add_context() for sums, strings, and lists
- Multiple accumulator patterns in complex workflows
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


async def run_comprehensive_example():
    """Comprehensive example showing all accumulator patterns"""
    
    print("=== Comprehensive Accumulator Patterns ===")
    print("Demonstrating all accumulator functions in a data processing workflow")
    print()

    if not os.getenv("OPENAI_API_KEY"):
        print("Note: Using mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    else:
        print("🔑 Using OpenAI as LLM provider (OPENAI_API_KEY is set)")
    
    # Load template from .apl file
    template_path = os.path.join(os.path.dirname(__file__), "accumulator_patterns.apl")
    template = load_template(template_path)
    
    try:
        context = await start(template, {'debug': False})
        
        # Extract results
        total = context.get('total_processed', 0)
        score_sum = context.get('score_sum', 0)
        cat_a_count = context.get('category_a_count', 0)
        cat_b_count = context.get('category_b_count', 0)
        high_performers = context.get('high_performers', [])
        all_names = context.get('all_names', [])
        
        print(f"✅ Processing completed!")
        print(f"📊 Total records: {total}")
        avg_score = score_sum / total if total > 0 else 0
        print(f"🧮 Average score: {avg_score:.2f}")
        print(f"🏆 High performers: {high_performers}")
        print(f"👥 All names: {all_names}")
        print(f"📈 Category A: {cat_a_count}, Category B: {cat_b_count}")
        print()
        print("📝 This example demonstrates:")
        print("   ✓ Loading templates from .apl files")
        print("   ✓ inc_context() for counting (total_processed, category counts)")
        print("   ✓ add_context() for sums (score_sum, category_scores)")
        print("   ✓ add_context() for lists (all_names, high_performers)")
        print("   ✓ add_context() for strings (report building)")
        print("   ✓ Multiple accumulators working together")
        print("   ✓ Complex data processing patterns")
        print("   ✓ Safe initialization with defaults")
        
    except Exception as e:
        print(f"❌ Error: {e}")


async def run_all_accumulator_examples():
    """Run all accumulator examples in sequence"""
    
    print("🚀 Running All Accumulator Examples")
    print("=" * 50)
    print()
    
    await run_comprehensive_example()


if __name__ == "__main__":
    asyncio.run(run_all_accumulator_examples())
