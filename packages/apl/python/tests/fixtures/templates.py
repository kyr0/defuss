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
{{ set_context('model', 'gpt-4o') }}
{{ set_context('temperature', 0.7) }}

# prompt: setup
## system
You are a helpful assistant.

## user
Analyze this image:
@image_url https://example.com/image.jpg
"""

TOOL_CALLING_TEMPLATE = """
# pre: calc
{{ set_context('model', 'gpt-4o') }}
{{ set_context('temperature', 0.7) }}
{{ set_context('allowed_tools', ['calc']) }}

# prompt: calc
## system
You can use the calc tool to add two numbers.

## user
What's the sum of 40 and 2?
"""

CONDITIONAL_TEMPLATE = """
# pre: test
{{ set_context('test_var', 'initial') }}

# prompt: test
## user
Test message

# post: test
{% if "helpful" in result_text %}
{{ set_context('next_step', 'success') }}
{% else %}
{{ set_context('next_step', 'retry') }}
{% endif %}

# prompt: success
## user
Success path

# prompt: retry
## user
Retry path
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
{{ set_context('test_data', {"user": {"name": "Alice", "items": [1, 2, 3]}}) }}
{{ set_context('name', get_json_path(test_data, "user.name", "unknown")) }}
{{ set_context('missing', get_json_path(test_data, "user.missing", "default")) }}
{{ set_context('item', get_json_path(test_data, "user.items.1", "none")) }}

# prompt: test
## user
Name: {{ name }}, Missing: {{ missing }}, Item: {{ item }}
"""

ERROR_HANDLING_TEMPLATE = """
# pre: error_test
{{ set_context('next_step', 'nonexistent') }}

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
