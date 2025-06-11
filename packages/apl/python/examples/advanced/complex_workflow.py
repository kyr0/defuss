#!/usr/bin/env python3
"""
Complex Workflow Example

This example demonstrates:
- Multi-phase complex workflows
- Decision trees with branching logic
- State management across multiple steps
- Advanced error handling and recovery
"""

import asyncio
import os
from defuss_apl import start


def validate_input(text: str) -> dict:
    """Validate input text and return analysis"""
    analysis = {
        "length": len(text),
        "words": len(text.split()),
        "has_email": "@" in text,
        "has_url": "http" in text or "www." in text,
        "sentiment": "positive" if any(word in text.lower() for word in ["good", "great", "excellent", "amazing"]) else "neutral"
    }
    
    analysis["is_valid"] = analysis["length"] > 10 and analysis["words"] > 2
    return analysis


def process_content(content: str, analysis: dict) -> dict:
    """Process content based on analysis"""
    result = {
        "original_length": analysis["length"],
        "processed": True,
        "recommendations": []
    }
    
    if analysis["length"] < 20:
        result["recommendations"].append("Consider adding more detail")
    
    if not analysis["has_email"] and not analysis["has_url"]:
        result["recommendations"].append("Consider adding contact information")
    
    if analysis["sentiment"] == "neutral":
        result["recommendations"].append("Consider using more positive language")
    
    result["score"] = min(100, (analysis["length"] // 10) * 10 + len(result["recommendations"]) * 5)
    
    return result


async def main():
    """Complex workflow with decision trees"""
    print("=== Complex Workflow Example ===")
    print("Demonstrates: Multi-phase workflows, decision trees, state management")
    print()
    
    template = """
# pre: input_validation
{{ set_context('allowed_tools', ['validate_input']) }}
{{ set_context('user_input', 'This is a great example of APL workflow processing with excellent capabilities!') }}

# prompt: input_validation
## system
You are a content validation assistant. Use the validate_input tool to analyze the following text.

## user
Please validate this input: "{{ get_context('user_input', 'default text') }}"

# post: input_validation
{% for tool_call in result_tool_calls %}
  {% if "validate_input" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('is_valid', get_json_path(tool_call.content, 'is_valid', false)) }}
    {{ set_context('word_count', get_json_path(tool_call.content, 'words', 0)) }}
    {{ set_context('sentiment', get_json_path(tool_call.content, 'sentiment', 'neutral')) }}
    {{ set_context('validation_analysis', tool_call.content) }}
  {% endif %}
{% endfor %}

{% if is_valid %}
    {{ set_context('next_step', 'content_processing') }}
{% else %}
    {{ set_context('next_step', 'input_error') }}
{% endif %}

# prompt: content_processing
## system
You are a content processing assistant. The input validation passed. Now process the content.

## user
Input validation successful! Words: {{ get_context('word_count', 0) }}, Sentiment: {{ get_context('sentiment', 'neutral') }}
Please use the process_content tool to process the validated content.

# post: content_processing
{{ set_context('allowed_tools', ['process_content']) }}

{% for tool_call in result_tool_calls %}
  {% if "process_content" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('processing_score', get_json_path(tool_call.content, 'score', 0)) }}
    {{ set_context('recommendations', get_json_path(tool_call.content, 'recommendations', [])) }}
    {{ set_context('processing_result', tool_call.content) }}
  {% endif %}
{% endfor %}

{% if processing_score >= 70 %}
    {{ set_context('next_step', 'success_summary') }}
{% elif processing_score >= 40 %}
    {{ set_context('next_step', 'improvement_needed') }}
{% else %}
    {{ set_context('next_step', 'major_revision') }}
{% endif %}

# prompt: success_summary
## system
You are a summary assistant. The content processing was successful.

## user
Excellent! Processing completed successfully with score {{ get_context('processing_score', 0) }}.
Create a success summary.

# post: success_summary
{{ set_context('workflow_status', 'completed_successfully') }}
{{ set_context('next_step', 'return') }}

# prompt: improvement_needed
## system  
You are an improvement assistant. The content needs some improvements.

## user
Content processing completed with score {{ get_context('processing_score', 0) }}. 
Recommendations: {{ get_context('recommendations', []) | join(", ") }}
Please suggest specific improvements.

# post: improvement_needed
{{ set_context('workflow_status', 'completed_with_suggestions') }}
{{ set_context('next_step', 'return') }}

# prompt: major_revision
## system
You are a revision assistant. The content needs major revision.

## user
Content processing score was low ({{ get_context('processing_score', 0) }}). 
Major revision needed. Recommendations: {{ get_context('recommendations', []) | join(", ") }}

# post: major_revision
{{ set_context('workflow_status', 'requires_major_revision') }}
{{ set_context('next_step', 'return') }}

# prompt: input_error
## system
You are an error handling assistant. The input validation failed.

## user
Input validation failed. The provided text did not meet minimum requirements.
Please provide feedback on how to improve the input.

# post: input_error
{{ set_context('workflow_status', 'input_validation_failed') }}
{{ set_context('next_step', 'return') }}
"""
    
    print("📝 Template (complex workflow with decision tree):")
    print("   - Input validation → Content processing → Results based on score")
    print()
    
    options = {
        "with_tools": {
            "validate_input": {"fn": validate_input},
            "process_content": {"fn": process_content}
        }
    }
    
    result = await start(template, options)
    
    print("✅ Workflow Results:")
    print(f"Status: {result.get('workflow_status')}")
    print(f"Total steps: {result['global_runs']}")
    print(f"Final step: {result.get('prev_step')}")
    
    if result.get('validation_analysis'):
        print(f"\nValidation Analysis:")
        analysis = result['validation_analysis']
        print(f"   - Valid: {analysis.get('is_valid')}")
        print(f"   - Words: {analysis.get('words')}")
        print(f"   - Sentiment: {analysis.get('sentiment')}")
    
    if result.get('processing_result'):
        print(f"\nProcessing Results:")
        processing = result['processing_result']
        print(f"   - Score: {processing.get('score')}")
        print(f"   - Recommendations: {processing.get('recommendations', [])}")
    
    print(f"\nFinal response: {result['result_text']}")
    
    # Show workflow path
    print(f"\nWorkflow path:")
    for i, context in enumerate(result.get('context_history', [])):
        step = context.get('current_step', 'unknown')
        print(f"   Step {i+1}: {step}")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock provider (set OPENAI_API_KEY for real LLM)")


if __name__ == "__main__":
    asyncio.run(main())
