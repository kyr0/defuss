"""
Unit tests for APL helper functions
"""

import pytest
from defuss_apl import start
from tests.fixtures.templates import JSON_HELPER_TEMPLATE


class TestSetContextFunction:
    """Test the set_context helper function"""
    
    @pytest.mark.asyncio
    async def test_basic_variable_assignment(self, basic_options):
        """Test basic variable assignment with set_context"""
        template = """
# pre: test
{{ set_context('test_var', 'test_value') }}
{{ set_context('number_var', 42) }}
{{ set_context('bool_var', True) }}

# prompt: test
## user
Variables: {{ get_context('test_var', 'default') }}, {{ get_context('number_var', 0) }}, {{ get_context('bool_var', False) }}
"""
        context = await start(template, basic_options)
        
        assert context["test_var"] == "test_value"
        assert context["number_var"] == 42
        assert context["bool_var"] is True
        assert "Variables: test_value, 42, True" in context["result_text"]

    @pytest.mark.asyncio
    async def test_conditional_assignment(self, basic_options):
        """Test set_context with conditional logic"""
        template = """
# pre: test
{{ set_context('condition_met', True) }}

# prompt: test
## user
Test message

# post: test
{% if "test" in result_text %}
{{ set_context('result_check', 'found_test') }}
{% else %}
{{ set_context('result_check', 'not_found') }}
{% endif %}
"""
        context = await start(template, basic_options)
        
        assert context["result_check"] in ["found_test", "not_found"]

    @pytest.mark.asyncio
    async def test_computed_values(self, basic_options):
        """Test set_context with computed values"""
        template = """
# pre: test
{{ set_context('base_value', 10) }}
{{ set_context('computed_value', get_context('base_value', 0) * 2 + 5) }}
{{ set_context('string_concat', 'prefix_' + 'suffix') }}

# prompt: test
## user
Computed: {{ get_context('computed_value', 0) }}, String: {{ get_context('string_concat', '') }}
"""
        context = await start(template, basic_options)
        
        assert context["base_value"] == 10
        assert context["computed_value"] == 25  # 10 * 2 + 5
        assert context["string_concat"] == "prefix_suffix"

    @pytest.mark.asyncio
    async def test_list_and_dict_assignment(self, basic_options):
        """Test set_context with complex data types"""
        template = """
# pre: test
{{ set_context('test_list', [1, 2, 3]) }}
{{ set_context('test_dict', {"key": "value", "num": 42}) }}
{{ set_context('list_length', get_context('test_list', []) | length) }}

# prompt: test
## user
List: {{ get_context('test_list', []) }}, Dict: {{ get_context('test_dict', {}) }}, Length: {{ get_context('list_length', 0) }}
"""
        context = await start(template, basic_options)
        
        assert context["test_list"] == [1, 2, 3]
        assert context["test_dict"] == {"key": "value", "num": 42}
        assert context["list_length"] == 3

    @pytest.mark.asyncio
    async def test_sequential_execution(self, basic_options):
        """Test that set_context executes sequentially"""
        template = """
# pre: test
{{ set_context('counter', 0) }}
{{ set_context('counter', get_context('counter', 0) + 1) }}
{{ set_context('counter', get_context('counter', 0) + 1) }}
{{ set_context('counter', get_context('counter', 0) + 1) }}

# prompt: test
## user
Counter: {{ get_context('counter', 0) }}
"""
        context = await start(template, basic_options)
        
        assert context["counter"] == 3


class TestGetJsonPathFunction:
    """Test the get_json_path helper function"""
    
    @pytest.mark.asyncio
    async def test_basic_json_extraction(self, basic_options):
        """Test basic JSON path extraction"""
        context = await start(JSON_HELPER_TEMPLATE, basic_options)
        
        assert context["name"] == "Alice"
        assert context["missing"] == "default"  # Should use default value
        assert context["item"] == 2  # items[1] should be 2

    @pytest.mark.asyncio
    async def test_nested_object_access(self, basic_options):
        """Test accessing nested object properties"""
        template = """
# pre: test
{{ set_context('data', {
    "user": {
        "profile": {
            "name": "Alice",
            "settings": {
                "theme": "dark",
                "notifications": True
            }
        }
    }
}) }}
{{ set_context('name', get_json_path(get_context('data', {}), "user.profile.name", "unknown")) }}
{{ set_context('theme', get_json_path(get_context('data', {}), "user.profile.settings.theme", "light")) }}
{{ set_context('invalid', get_json_path(get_context('data', {}), "user.profile.invalid", "default")) }}

# prompt: test
## user
Name: {{ get_context('name', 'unknown') }}, Theme: {{ get_context('theme', 'light') }}, Invalid: {{ get_context('invalid', 'default') }}
"""
        context = await start(template, basic_options)
        
        assert context["name"] == "Alice"
        assert context["theme"] == "dark"
        assert context["invalid"] == "default"

    @pytest.mark.asyncio
    async def test_array_access(self, basic_options):
        """Test accessing array elements"""
        template = """
# pre: test
{{ set_context('data', {
    "items": [
        {"name": "first", "value": 1},
        {"name": "second", "value": 2},
        {"name": "third", "value": 3}
    ]
}) }}
{{ set_context('first_name', get_json_path(get_context('data', {}), "items.0.name", "none")) }}
{{ set_context('second_value', get_json_path(get_context('data', {}), "items.1.value", 0)) }}
{{ set_context('invalid_index', get_json_path(get_context('data', {}), "items.10.name", "missing")) }}

# prompt: test
## user
First: {{ get_context('first_name', 'none') }}, Second: {{ get_context('second_value', 0) }}, Invalid: {{ get_context('invalid_index', 'missing') }}
"""
        context = await start(template, basic_options)
        
        assert context["first_name"] == "first"
        assert context["second_value"] == 2
        assert context["invalid_index"] == "missing"

    @pytest.mark.asyncio
    async def test_default_value_handling(self, basic_options):
        """Test default value handling for missing paths"""
        template = """
# pre: test
{{ set_context('data', {"existing": "value"}) }}
{{ set_context('existing', get_json_path(get_context('data', {}), "existing", "default")) }}
{{ set_context('missing_with_default', get_json_path(get_context('data', {}), "missing", "default_value")) }}
{{ set_context('missing_no_default', get_json_path(get_context('data', {}), "missing")) }}

# prompt: test
## user
Existing: {{ get_context('existing', 'default') }}, Missing with default: {{ get_context('missing_with_default', 'default_value') }}, Missing no default: {{ get_context('missing_no_default', None) }}
"""
        context = await start(template, basic_options)
        
        assert context["existing"] == "value"
        assert context["missing_with_default"] == "default_value"
        assert context["missing_no_default"] is None

    @pytest.mark.asyncio
    async def test_tool_result_extraction(self, basic_options):
        """Test extracting data from tool results using get_json_path"""
        template = """
# pre: test
{{ set_context('mock_tool_results', [
    {
        "role": "tool",
        "tool_call_id": "call_1",
        "content": {"status": "success", "data": {"result": 42}},
        "with_error": False
    },
    {
        "role": "tool", 
        "tool_call_id": "call_2",
        "content": {"status": "error", "message": "Failed"},
        "with_error": True
    }
]) }}

# prompt: test
## user
Processing tool results...

# post: test
{% for tool_call in mock_tool_results %}
  {% if not tool_call.with_error %}
    {{ set_context('success_status', get_json_path(tool_call.content, "status", "unknown")) }}
    {{ set_context('result_value', get_json_path(tool_call.content, "data.result", 0)) }}
  {% endif %}
{% endfor %}
"""
        context = await start(template, basic_options)
        
        assert context["success_status"] == "success"
        assert context["result_value"] == 42
