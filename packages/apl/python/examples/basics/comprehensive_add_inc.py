#!/usr/bin/env python3
"""
Comprehensive example demonstrating the APL improvements:
1. Loading templates from .apl files
2. Explicit termination behavior
3. New accumulator helper functions (add_context, inc_context)  
4. Improved variable handling with get_context defaults
"""

import asyncio
import os
from defuss_apl import start

def load_template(file_path):
    """Load an APL template from a file"""
    with open(file_path, 'r') as f:
        return f.read()

async def run_comprehensive_add_inc_example():
    """Demonstrate improved APL features"""
    
    print("=== APL Demo ===\n")

    if not os.getenv("OPENAI_API_KEY"):
        print("Note: Using mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    else:
        print("🔑 Using OpenAI as LLM provider (OPENAI_API_KEY is set)")
    
    # Example 1: Explicit termination - single step terminates automatically
    print("1. Explicit Termination Behavior:")
    template_path = os.path.join(os.path.dirname(__file__), "comprehensive_add_inc_termination.apl")
    template_termination = load_template(template_path)
    
    context = await start(template_termination, {'debug': False})
    print(f"   Single step executed and terminated: {context['current_step']}")
    print(f"   Context history length: {len(context['context_history'])}")
    print()
    
    # Example 2: Explicit transitions for multi-step workflows
    print("2. Explicit Step Transitions:")
    template_path = os.path.join(os.path.dirname(__file__), "comprehensive_add_inc_transitions.apl")
    template_transitions = load_template(template_path)
    
    context = await start(template_transitions, {'debug': False})
    print(f"   All three steps executed: {len(context['context_history'])} steps")
    print(f"   Final step: {context['current_step']}")
    print()
    
    # Example 3: Accumulator functions in action
    print("3. Accumulator Functions:")
    template_path = os.path.join(os.path.dirname(__file__), "comprehensive_add_inc_accumulators.apl")
    template_accumulators = load_template(template_path)
    
    context = await start(template_accumulators, {'debug': False})
    print(f"   Iterations: {context.get('iteration_count')}")
    print(f"   Sum: {context.get('sum')}")
    print(f"   Message: '{context.get('message')}'")
    print(f"   Items: {context.get('items')}")
    print()
    
    # Example 4: Complex data processing with accumulator patterns
    print("4. Complex Data Processing:")
    template_path = os.path.join(os.path.dirname(__file__), "comprehensive_add_inc_complex.apl")
    template_complex = load_template(template_path)
    
    context = await start(template_complex, {'debug': False})
    print(f"   Total processed: {context.get('total_processed')}")
    print(f"   Score sum: {context.get('score_sum')}")
    print(f"   Category A count: {context.get('category_a_count')}")
    print(f"   High performers: {context.get('high_performers')}")
    print()
    
    print("✅ All examples completed successfully!")
    print("📝 Key improvements demonstrated:")
    print("   - Loading templates from .apl files")
    print("   - Explicit termination (no fallthrough)")
    print("   - Safe variable access with defaults")
    print("   - Convenient accumulator functions")
    print("   - Robust iterative processing patterns")

if __name__ == "__main__":
    asyncio.run(run_comprehensive_add_inc_example())
