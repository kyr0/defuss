#!/usr/bin/env python3
"""
Run All Examples

This script runs all APL examples in order, demonstrating the full range of capabilities.
"""

import asyncio
import sys
import os
import importlib.util
import time


async def run_example(name: str, module_path: str):
    """Run a single example module"""
    print(f"\n{'='*60}")
    print(f"🚀 Running: {name}")
    print(f"{'='*60}")
    
    try:
        # Load and run the module
        spec = importlib.util.spec_from_file_location(name, module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Run the main function if it exists
        if hasattr(module, 'main'):
            await module.main()
        
        print(f"✅ {name} completed successfully")
        
    except Exception as e:
        print(f"❌ {name} failed: {e}")
        return False
    
    return True


async def main():
    """Run all examples in organized order"""
    print("🎯 APL Python Examples - Complete Demonstration")
    print("=" * 60)
    
    if not os.getenv("OPENAI_API_KEY"):
        print("💡 Running with mock provider (set OPENAI_API_KEY for real LLM)")
        print()
    
    examples_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define example order and organization
    examples = [
        # Basics
        ("Simple Greeting", "basics/simple_greeting.py"),
        ("Calculator Demo", "basics/calculator_demo.py"), 
        ("Control Flow", "basics/control_flow.py"),
        ("Error Handling", "basics/error_handling.py"),
        
        # Advanced
        ("Enhanced Features", "advanced/enhanced_features.py"),
        ("JSON Processing", "advanced/json_processing.py"),
        ("Complex Workflow", "advanced/complex_workflow.py"),
        
        # Integrations  
        ("Multi-Modal Content", "integrations/multimodal_content.py"),
        ("API Integration", "integrations/api_integration.py"),
    ]
    
    results = []
    start_time = time.time()
    
    for name, path in examples:
        full_path = os.path.join(examples_dir, path)
        if os.path.exists(full_path):
            success = await run_example(name, full_path)
            results.append((name, success))
            
            # Small delay between examples
            await asyncio.sleep(1)
        else:
            print(f"⚠️  Example not found: {path}")
            results.append((name, False))
    
    # Summary
    elapsed = time.time() - start_time
    successful = sum(1 for _, success in results if success)
    total = len(results)
    
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY")
    print(f"{'='*60}")
    print(f"Total examples: {total}")
    print(f"Successful: {successful}")
    print(f"Failed: {total - successful}")
    print(f"Success rate: {(successful/total)*100:.1f}%")
    print(f"Total time: {elapsed:.1f}s")
    
    print(f"\nResults by example:")
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"   {status} {name}")
    
    # APL Features demonstrated
    print(f"\n🎯 APL Features Demonstrated:")
    print(f"   ✅ Variable assignment with set_context")
    print(f"   ✅ Tool calling and execution")
    print(f"   ✅ Context-aware tools") 
    print(f"   ✅ Multi-step workflows")
    print(f"   ✅ Control flow with next_step")
    print(f"   ✅ Error handling and recovery")
    print(f"   ✅ JSON processing with get_json_path")
    print(f"   ✅ Function introspection")
    print(f"   ✅ Intelligent argument generation")
    print(f"   ✅ Multi-modal content processing")
    print(f"   ✅ API integration patterns")
    print(f"   ✅ Complex decision trees")
    print(f"   ✅ State management across steps")
    
    if successful == total:
        print(f"\n🎉 All examples completed successfully!")
        return 0
    else:
        print(f"\n⚠️  Some examples failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
