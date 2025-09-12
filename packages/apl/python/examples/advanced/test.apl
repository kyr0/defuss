# pre: input_validation
{{ set('allowed_tools', ['validate_input']) }}
{{ set('user_input', 'This is a great example of APL workflow processing with excellent capabilities!') }}

# prompt: input_validation
## system
You are a content validation assistant. Use the validate_input tool to analyze the following text.

## user
Please validate this input: "{{ get('user_input', 'default text') }}"

# post: input_validation
for tool_call in result_tool_calls
  if "validate_input" in tool_call.tool_call_id and not tool_call.with_error
     set('is_valid', get_json_path(tool_call.content, 'is_valid', false)) 
     set('validation_message', get_json_path(tool_call.content, 'message', 'Validation failed')) 
     set('word_count', get_json_path(tool_call.content, 'words', 0)) 
     set('sentiment', get_json_path(tool_call.content, 'sentiment', 'neutral')) 
     set('validation_analysis', tool_call.content) 
  endfor

{% if is_valid %}
    {{ set('next_step', 'content_processing') }}
{% else %}
    {{ set('next_step', 'input_error') }}
{% endif %}

# prompt: content_processing
## system
You are a content processing assistant. The input validation passed. Now process the content.

## user
Input validation successful! Words: {{ get('word_count', 0) }}, Sentiment: {{ get('sentiment', 'neutral') }}
Please use the process_content tool to process the validated content.

# post: content_processing
{{ set('allowed_tools', ['process_content']) }}

{% for tool_call in result_tool_calls %}
  {% if "process_content" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set('processing_score', get_json_path(tool_call.content, 'score', 0)) }}
    {{ set('recommendations', get_json_path(tool_call.content, 'recommendations', [])) }}
    {{ set('processing_result', tool_call.content) }}
  {% endif %}
{% endfor %}

{% if processing_score >= 70 %}
    {{ set('next_step', 'success_summary') }}
{% elif processing_score >= 40 %}
    {{ set('next_step', 'improvement_needed') }}
{% else %}
    {{ set('next_step', 'major_revision') }}
{% endif %}

# prompt: success_summary
## system
You are a summary assistant. The content processing was successful.

## user
Excellent! Processing completed successfully with score {{ get('processing_score', 0) }}.
Create a success summary.

# post: success_summary
{{ set('workflow_status', 'completed_successfully') }}
{{ set('next_step', 'return') }}

# prompt: improvement_needed
## system  
You are an improvement assistant. The content needs some improvements.

## user
Content processing completed with score {{ get('processing_score', 0) }}. 
Recommendations: {{ get('recommendations', []) | join(", ") }}
Please suggest specific improvements.

# post: improvement_needed
{{ set('workflow_status', 'completed_with_suggestions') }}
{{ set('next_step', 'return') }}

# prompt: major_revision
## system
You are a revision assistant. The content needs major revision.

## user
Content processing score was low ({{ get('processing_score', 0) }}). 
Major revision needed. Recommendations: {{ get('recommendations', []) | join(", ") }}

# post: major_revision
{{ set('workflow_status', 'requires_major_revision') }}
{{ set('next_step', 'return') }}

# prompt: input_error
## system
You are an error handling assistant. The input validation failed.

## user
Input validation failed. The provided text did not meet minimum requirements.
Please provide feedback on how to improve the input.

# post: input_error
{{ set('workflow_status', 'input_validation_failed') }}
{{ set('next_step', 'return') }}