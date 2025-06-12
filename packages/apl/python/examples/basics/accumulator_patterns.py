#!/usr/bin/env python3
"""
Comprehensive Accumulator Patterns Example

This example demonstrates all accumulator helper functions:
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


async def run_comprehensive_example():
    """Comprehensive example showing all accumulator patterns"""
    
    print("=== Comprehensive Accumulator Patterns ===")
    print("Demonstrating all accumulator functions in a data processing workflow")
    print()
    
    template = """
# pre: process_data
{# Initialize dataset if not exists #}
{% if get_context('dataset') is none %}
{{ set_context('dataset', [
    {"name": "Alice", "score": 85, "category": "A"},
    {"name": "Bob", "score": 92, "category": "A"}, 
    {"name": "Charlie", "score": 78, "category": "B"},
    {"name": "Diana", "score": 96, "category": "A"},
    {"name": "Eve", "score": 88, "category": "B"}
]) }}
{{ set_context('index', 0) }}
{% endif %}

{# Get current item #}
{% set current_item = get_context('dataset', [])[get_context('index', 0)] %}
{% set name = current_item.name %}
{% set score = current_item.score %}
{% set category = current_item.category %}

{# Count total processed #}
{{ inc_context('total_processed') }}

{# Sum all scores #}
{{ add_context('score_sum', score) }}

{# Count by category #}
{% if category == 'A' %}
{{ inc_context('category_a_count') }}
{{ add_context('category_a_scores', score) }}
{% else %}
{{ inc_context('category_b_count') }}
{{ add_context('category_b_scores', score) }}
{% endif %}

{# Build lists #}
{{ add_context('all_names', [name], []) }}
{% if score >= 90 %}
{{ add_context('high_performers', [name], []) }}
{% endif %}

{# Build report string #}
{{ add_context('report', name + ' (' + category + '): ' + score|string, '') }}
{% if get_context('index', 0) < get_context('dataset', [])|length - 1 %}
{{ add_context('report', ', ') }}
{% endif %}

{# Next iteration #}
{{ inc_context('index') }}

# prompt: process_data
## user
Processing {{ name }}: Score={{ score }}, Category={{ category }}
Progress: {{ get_context('total_processed', 0) }}/{{ get_context('dataset', [])|length }}

# post: process_data
{% if get_context('index', 0) < get_context('dataset', [])|length %}
{{ set_context('next_step', 'process_data') }}
{% else %}
{{ set_context('next_step', 'analytics') }}
{% endif %}

# prompt: analytics
## user
Data Processing Complete! 📊

=== SUMMARY STATISTICS ===
Total Records: {{ get_context('total_processed', 0) }}
Average Score: {{ (get_context('score_sum', 0) / get_context('total_processed', 1))|round(2) }}

=== BY CATEGORY ===
Category A: {{ get_context('category_a_count', 0) }} people, avg {{ (get_context('category_a_scores', 0) / get_context('category_a_count', 1))|round(2) if get_context('category_a_count', 0) > 0 else 'N/A' }}
Category B: {{ get_context('category_b_count', 0) }} people, avg {{ (get_context('category_b_scores', 0) / get_context('category_b_count', 1))|round(2) if get_context('category_b_count', 0) > 0 else 'N/A' }}

=== HIGH PERFORMERS (≥90) ===
{{ get_context('high_performers', [])|join(', ') if get_context('high_performers', []) else 'None' }}

=== PROCESSED DATA ===
{{ get_context('report', '') }}
"""
    
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
