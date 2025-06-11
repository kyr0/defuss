#!/usr/bin/env python3
"""
Multi-Modal Content Example

This example demonstrates:
- Working with images, files, and mixed content
- Multi-modal prompt construction
- Content type handling
- Attachment processing
"""

import asyncio
import os
from defuss_apl import start


def analyze_image(image_url: str) -> dict:
    """Mock image analysis tool"""
    # Simulate image analysis
    analysis = {
        "url": image_url,
        "detected_objects": ["person", "building", "sky"],
        "colors": ["blue", "white", "gray"],
        "estimated_size": "1920x1080",
        "format": "PNG" if image_url.endswith('.png') else "JPG",
        "analysis_confidence": 0.95
    }
    return analysis


def process_document(file_url: str) -> dict:
    """Mock document processing tool"""
    # Simulate document processing
    processing = {
        "url": file_url,
        "detected_type": "PDF" if file_url.endswith('.pdf') else "Text",
        "estimated_pages": 5,
        "text_preview": "This document contains important information about...",
        "key_topics": ["technology", "innovation", "future"],
        "processing_status": "completed"
    }
    return processing


async def main():
    """Multi-modal content processing"""
    print("=== Multi-Modal Content Example ===")
    print("Demonstrates: Images, files, mixed content, attachment processing")
    print()
    
    template = """
# pre: setup
{{ set_context('allowed_tools', ['analyze_image', 'process_document']) }}

# prompt: setup
## system
You are a multi-modal content assistant. You can analyze images and process documents to provide comprehensive insights.

## user
Please analyze the content I'm sharing with you. I have an image and a document:

@image_url https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Sunrise.PNG/330px-Sunrise.PNG
@file https://example.com/technical-report.pdf

Use your tools to analyze both the image and document, then provide a summary.

# post: setup
{{ set_context('image_analysis', none) }}
{{ set_context('document_analysis', none) }}
{{ set_context('total_attachments', 0) }}

{% for tool_call in result_tool_calls %}
  {% if "analyze_image" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('image_analysis', tool_call.content) }}
    {{ set_context('total_attachments', total_attachments + 1) }}
    
    Image analyzed: {{ get_json_path(tool_call.content, 'format', 'unknown') }} format
    Objects detected: {{ get_json_path(tool_call.content, 'detected_objects', []) | join(", ") }}
    
  {% elif "process_document" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('document_analysis', tool_call.content) }}
    {{ set_context('total_attachments', total_attachments + 1) }}
    
    Document processed: {{ get_json_path(tool_call.content, 'detected_type', 'unknown') }}
    Topics: {{ get_json_path(tool_call.content, 'key_topics', []) | join(", ") }}
  {% endif %}
{% endfor %}

{% if total_attachments >= 2 %}
    {{ set_context('next_step', 'comprehensive_analysis') }}
{% else %}
    {{ set_context('next_step', 'partial_analysis') }}
{% endif %}

# prompt: comprehensive_analysis
## system
You are an analytical assistant. Both the image and document have been processed successfully.

## user
Excellent! Both attachments were processed:

Image Analysis Results:
- Format: {{ get_json_path(image_analysis, 'format', 'unknown') }}
- Size: {{ get_json_path(image_analysis, 'estimated_size', 'unknown') }}
- Objects: {{ get_json_path(image_analysis, 'detected_objects', []) | join(", ") }}
- Colors: {{ get_json_path(image_analysis, 'colors', []) | join(", ") }}

Document Analysis Results:
- Type: {{ get_json_path(document_analysis, 'detected_type', 'unknown') }}
- Pages: {{ get_json_path(document_analysis, 'estimated_pages', 0) }}
- Topics: {{ get_json_path(document_analysis, 'key_topics', []) | join(", ") }}

Please provide a comprehensive analysis connecting insights from both sources.

# post: comprehensive_analysis
{{ set_context('analysis_type', 'comprehensive') }}
{{ set_context('next_step', 'return') }}

# prompt: partial_analysis
## system
You are an analytical assistant. Only partial content was processed.

## user
Some content was processed but not all attachments were successfully analyzed.
Processed: {{ total_attachments }} out of 2 attachments.

Please provide analysis based on what was successfully processed.

# post: partial_analysis
{{ set_context('analysis_type', 'partial') }}
{{ set_context('next_step', 'return') }}
"""
    
    print("📝 Template:")
    print("   - Multi-modal content with @image_url and @file attachments")
    print("   - Tool-based analysis of different content types")
    print("   - Conditional workflow based on processing success")
    print()
    
    options = {
        "with_tools": {
            "analyze_image": {"fn": analyze_image},
            "process_document": {"fn": process_document}
        }
    }
    
    result = await start(template, options)
    
    print("✅ Multi-Modal Results:")
    print(f"Total attachments processed: {result.get('total_attachments', 0)}")
    print(f"Analysis type: {result.get('analysis_type', 'unknown')}")
    
    # Check prompts for multimodal content
    if result['prompts']:
        prompt = result['prompts'][0]
        content = prompt.get('content', [])
        if isinstance(content, list):
            print(f"\nPrompt content parts: {len(content)}")
            for i, part in enumerate(content):
                if isinstance(part, dict):
                    part_type = part.get('type', 'unknown')
                    print(f"   Part {i+1}: {part_type}")
                    if part_type == 'image_url':
                        print(f"      → Image: {part.get('image_url', {}).get('url', 'unknown')}")
                    elif part_type == 'file':
                        print(f"      → File: {part.get('file', {}).get('url', 'unknown')}")
    
    if result['result_tool_calls']:
        print(f"\nTool executions: {len(result['result_tool_calls'])}")
        for call in result['result_tool_calls']:
            tool_id = call.get('tool_call_id', 'unknown')
            if 'analyze_image' in tool_id:
                print(f"   - Image analysis completed")
            elif 'process_document' in tool_id:
                print(f"   - Document processing completed")
    
    image_analysis = result.get('image_analysis')
    if image_analysis:
        print(f"\nImage Analysis:")
        print(f"   - Objects: {image_analysis.get('detected_objects', [])}")
        print(f"   - Colors: {image_analysis.get('colors', [])}")
    
    doc_analysis = result.get('document_analysis')
    if doc_analysis:
        print(f"\nDocument Analysis:")
        print(f"   - Topics: {doc_analysis.get('key_topics', [])}")
        print(f"   - Pages: {doc_analysis.get('estimated_pages', 0)}")
    
    print(f"\nFinal response: {result['result_text']}")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock provider with simulated multi-modal processing")


if __name__ == "__main__":
    asyncio.run(main())
