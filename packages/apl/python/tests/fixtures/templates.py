"""
Common template fixtures for APL tests
"""

# Basic templates
SIMPLE_TEMPLATE = """
# prompt: greet
Hello, how are you?
"""

MULTIMODAL_TEMPLATE = """
# pre: setup
{{ set('model', 'gpt-4o') }}
{{ set('temperature', 0.7) }}

# prompt: setup
## system
You are a helpful assistant.

## user
Analyze this image:
@image_url https://example.com/image.jpg
"""

TOOL_CALLING_TEMPLATE = """
# pre: calc
{{ set('model', 'gpt-4o') }}
{{ set('temperature', 0.7) }}
{{ set('allowed_tools', ['calc']) }}

# prompt: calc
## system
You can use the calc tool to add two numbers.

## user
What's the sum of 40 and 2?
"""

CONDITIONAL_TEMPLATE = """
# pre: test
{{ set('test_var', 'initial') }}

# prompt: test
## user
Test message

# post: test
{% if "helpful" in result_text %}
{{ set('next_step', 'success') }}
{% else %}
{{ set('next_step', 'retry') }}
{% endif %}

# prompt: success
## user
Success path

# post: success
{{ set('next_step', 'return') }}

# prompt: retry
## user
Retry path

# post: retry
{{ set('next_step', 'return') }}
"""

ROLE_CONCATENATION_TEMPLATE = """
# prompt: test
## system
First system message.

## user
User message.

## system
Second system message.
"""

JSON_HELPER_TEMPLATE = """
# pre: test
{{ set('test_data', {"user": {"name": "Alice", "items": [1, 2, 3]}}) }}
{{ set('name', get_json_path(get('test_data', {}), "user.name", "unknown")) }}
{{ set('missing', get_json_path(get('test_data', {}), "user.missing", "default")) }}
{{ set('item', get_json_path(get('test_data', {}), "user.items.1", "none")) }}

# prompt: test
## user
Name: {{ get('name', 'unknown') }}, Missing: {{ get('missing', 'default') }}, Item: {{ get('item', 'none') }}
"""

ERROR_HANDLING_TEMPLATE = """
# pre: error_test
{{ set('next_step', 'nonexistent') }}

# prompt: error_test
## user
This should cause an error
"""

VALIDATION_ERROR_TEMPLATES = {
    "reserved_identifier": """
# prompt: return
Test
""",
    "duplicate_identifier": """
# pre: test
Test

# prompt: test
Test

# pre: test
Duplicate
""",
    "invalid_identifier": """
# prompt: test:invalid
Test
""",
    "jinja_in_heading": """
# prompt: {{ variable }}
Test
"""
}
