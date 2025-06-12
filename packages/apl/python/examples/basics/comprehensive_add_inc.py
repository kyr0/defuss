#!/usr/bin/env python3
"""
Comprehensive example demonstrating the APL improvements:
1. Explicit termination behavior
2. New accumulator helper functions (add_context, inc_context)  
3. Improved variable handling with get_context defaults
"""

import asyncio
from defuss_apl import start

async def run_comprehensive_add_inc_example():
    """Demonstrate improved APL features"""
    
    print("=== APL Improvements Demo ===\n")
    
    # Example 1: Explicit termination - single step terminates automatically
    print("1. Explicit Termination Behavior:")
    template_termination = """
# prompt: single_step
## user
This step will terminate automatically (no next_step needed)
"""
    
    context = await start(template_termination, {'debug': False})
    print(f"   Single step executed and terminated: {context['current_step']}")
    print(f"   Context history length: {len(context['context_history'])}")
    print()
    
    # Example 2: Explicit transitions for multi-step workflows
    print("2. Explicit Step Transitions:")
    template_transitions = """
# prompt: step1
## user
Step 1: Initialize

# post: step1
{{ set_context('next_step', 'step2') }}

# prompt: step2
## user  
Step 2: Process

# post: step2
{{ set_context('next_step', 'step3') }}

# prompt: step3
## user
Step 3: Finalize
"""
    
    context = await start(template_transitions, {'debug': False})
    print(f"   All three steps executed: {len(context['context_history'])} steps")
    print(f"   Final step: {context['current_step']}")
    print()
    
    # Example 3: Accumulator functions in action
    print("3. Accumulator Functions:")
    template_accumulators = """
# pre: accumulate
{{ inc_context('iteration_count') }}
{{ add_context('sum', 10) }}
{{ add_context('message', 'Step ', '') }}
{{ add_context('message', get_context('iteration_count', 0)|string) }}
{{ add_context('items', [get_context('iteration_count', 0)], []) }}

# prompt: accumulate
## user
Iteration {{ get_context('iteration_count', 0) }}: Sum={{ get_context('sum', 0) }}, Message="{{ get_context('message', '') }}", Items={{ get_context('items', []) }}

# post: accumulate
{% if get_context('iteration_count', 0) < 3 %}
{{ set_context('next_step', 'accumulate') }}
{% else %}
{{ set_context('next_step', 'summary') }}
{% endif %}

# prompt: summary
## user
Final Results:
- Total iterations: {{ get_context('iteration_count', 0) }}
- Final sum: {{ get_context('sum', 0) }}
- Final message: "{{ get_context('message', '') }}"
- All items: {{ get_context('items', []) }}
"""
    
    context = await start(template_accumulators, {'debug': False})
    print(f"   Iterations: {context.get('iteration_count')}")
    print(f"   Sum: {context.get('sum')}")
    print(f"   Message: '{context.get('message')}'")
    print(f"   Items: {context.get('items')}")
    print()
    
    # Example 4: Complex data processing with accumulator patterns
    print("4. Complex Data Processing:")
    template_complex = """
# pre: process_data
{% if get_context('dataset') is none %}
{{ set_context('dataset', [
    {"name": "Alice", "score": 85, "category": "A"},
    {"name": "Bob", "score": 92, "category": "A"}, 
    {"name": "Charlie", "score": 78, "category": "B"},
    {"name": "Diana", "score": 96, "category": "A"}
]) }}
{{ set_context('index', 0) }}
{% endif %}

{% set current_item = get_context('dataset', [])[get_context('index', 0)] %}
{% set score = current_item.score %}
{% set category = current_item.category %}

{# Accumulate statistics #}
{{ inc_context('total_processed') }}
{{ add_context('score_sum', score) }}
{% if category == 'A' %}
{{ inc_context('category_a_count') }}
{{ add_context('category_a_scores', score) }}
{% endif %}

{# Build processed list #}
{{ add_context('high_performers', [current_item.name] if score > 90 else [], []) }}

{{ inc_context('index') }}

# prompt: process_data
## user
Processing {{ current_item.name }}: Score={{ score }}, Category={{ category }}

# post: process_data
{% if get_context('index', 0) < get_context('dataset', [])|length %}
{{ set_context('next_step', 'process_data') }}
{% else %}
{{ set_context('next_step', 'analytics') }}
{% endif %}

# prompt: analytics
## user
Data Processing Complete!

Statistics:
- Total processed: {{ get_context('total_processed', 0) }}
- Average score: {{ (get_context('score_sum', 0) / get_context('total_processed', 1))|round(2) }}
- Category A count: {{ get_context('category_a_count', 0) }}
- Category A average: {{ (get_context('category_a_scores', 0) / get_context('category_a_count', 1))|round(2) if get_context('category_a_count', 0) > 0 else 'N/A' }}
- High performers (>90): {{ get_context('high_performers', []) }}
"""
    
    context = await start(template_complex, {'debug': False})
    print(f"   Total processed: {context.get('total_processed')}")
    print(f"   Score sum: {context.get('score_sum')}")
    print(f"   Category A count: {context.get('category_a_count')}")
    print(f"   High performers: {context.get('high_performers')}")
    print()
    
    print("✅ All examples completed successfully!")
    print("📝 Key improvements demonstrated:")
    print("   - Explicit termination (no fallthrough)")
    print("   - Safe variable access with defaults")
    print("   - Convenient accumulator functions")
    print("   - Robust iterative processing patterns")

if __name__ == "__main__":
    asyncio.run(run_comprehensive_add_inc_example())
