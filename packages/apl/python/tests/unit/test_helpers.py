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
{{ set('test_var', 'test_value') }}
{{ set('number_var', 42) }}
{{ set('bool_var', True) }}

# prompt: test
## user
Variables: {{ get('test_var', 'default') }}, {{ get('number_var', 0) }}, {{ get('bool_var', False) }}
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
{{ set('condition_met', True) }}

# prompt: test
## user
Test message

# post: test
{% if "test" in result_text %}
{{ set('result_check', 'found_test') }}
{% else %}
{{ set('result_check', 'not_found') }}
{% endif %}
"""
        context = await start(template, basic_options)
        
        assert context["result_check"] in ["found_test", "not_found"]

    @pytest.mark.asyncio
    async def test_computed_values(self, basic_options):
        """Test set_context with computed values"""
        template = """
# pre: test
{{ set('base_value', 10) }}
{{ set('computed_value', get('base_value', 0) * 2 + 5) }}
{{ set('string_concat', 'prefix_' + 'suffix') }}

# prompt: test
## user
Computed: {{ get('computed_value', 0) }}, String: {{ get('string_concat', '') }}
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
{{ set('test_list', [1, 2, 3]) }}
{{ set('test_dict', {"key": "value", "num": 42}) }}
{{ set('list_length', get('test_list', []) | length) }}

# prompt: test
## user
List: {{ get('test_list', []) }}, Dict: {{ get('test_dict', {}) }}, Length: {{ get('list_length', 0) }}
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
{{ set('counter', 0) }}
{{ set('counter', get('counter', 0) + 1) }}
{{ set('counter', get('counter', 0) + 1) }}
{{ set('counter', get('counter', 0) + 1) }}

# prompt: test
## user
Counter: {{ get('counter', 0) }}
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
{{ set('data', {
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
{{ set('name', get_json_path(get('data', {}), "user.profile.name", "unknown")) }}
{{ set('theme', get_json_path(get('data', {}), "user.profile.settings.theme", "light")) }}
{{ set('invalid', get_json_path(get('data', {}), "user.profile.invalid", "default")) }}

# prompt: test
## user
Name: {{ get('name', 'unknown') }}, Theme: {{ get('theme', 'light') }}, Invalid: {{ get('invalid', 'default') }}
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
{{ set('data', {
    "items": [
        {"name": "first", "value": 1},
        {"name": "second", "value": 2},
        {"name": "third", "value": 3}
    ]
}) }}
{{ set('first_name', get_json_path(get('data', {}), "items.0.name", "none")) }}
{{ set('second_value', get_json_path(get('data', {}), "items.1.value", 0)) }}
{{ set('invalid_index', get_json_path(get('data', {}), "items.10.name", "missing")) }}

# prompt: test
## user
First: {{ get('first_name', 'none') }}, Second: {{ get('second_value', 0) }}, Invalid: {{ get('invalid_index', 'missing') }}
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
{{ set('data', {"existing": "value"}) }}
{{ set('existing', get_json_path(get('data', {}), "existing", "default")) }}
{{ set('missing_with_default', get_json_path(get('data', {}), "missing", "default_value")) }}
{{ set('missing_no_default', get_json_path(get('data', {}), "missing")) }}

# prompt: test
## user
Existing: {{ get('existing', 'default') }}, Missing with default: {{ get('missing_with_default', 'default_value') }}, Missing no default: {{ get('missing_no_default', None) }}
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
{{ set('mock_tool_results', [
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
    {{ set('success_status', get_json_path(tool_call.content, "status", "unknown")) }}
    {{ set('result_value', get_json_path(tool_call.content, "data.result", 0)) }}
  {% endif %}
{% endfor %}
"""
        context = await start(template, basic_options)
        
        assert context["success_status"] == "success"
        assert context["result_value"] == 42


class TestGetFunction:
    """Test the get helper function that combines get_context and get_json_path"""
    
    @pytest.mark.asyncio
    async def test_basic_variable_retrieval(self, basic_options):
        """Test basic variable retrieval with get"""
        template = """
# pre: test
{{ set('string_var', 'hello') }}
{{ set('num_var', 42) }}
{{ set('retrieved_string', get('string_var', 'default')) }}
{{ set('retrieved_num', get('num_var', 0)) }}
{{ set('missing_var', get('does_not_exist', 'missing')) }}

# prompt: test
## user
Retrieved: {{ get('retrieved_string', '') }}, {{ get('retrieved_num', 0) }}, {{ get('missing_var', '') }}
"""
        context = await start(template, basic_options)
        
        assert context["retrieved_string"] == "hello"
        assert context["retrieved_num"] == 42
        assert context["missing_var"] == "missing"


class TestSetFunction:
    """Test the set helper function that combines set_context and json path setting"""
    
    @pytest.mark.asyncio
    async def test_basic_variable_setting(self, basic_options):
        """Test basic variable setting with set"""
        template = """
# pre: test
{{ set('string_var', 'hello') }}
{{ set('num_var', 42) }}
{{ set('bool_var', True) }}

# prompt: test
## user
Variables: {{ get('string_var', '') }}, {{ get('num_var', 0) }}, {{ get('bool_var', False) }}
"""
        context = await start(template, basic_options)
        
        assert context["string_var"] == "hello"
        assert context["num_var"] == 42
        assert context["bool_var"] is True
        assert "Variables: hello, 42, True" in context["result_text"]

    @pytest.mark.asyncio
    async def test_json_path_setting(self, basic_options):
        """Test setting values via JSON path"""
        template = """
# pre: test
{{ set('user', {
    "name": "Alice",
    "profile": {
        "age": 30,
        "settings": {
            "theme": "light"
        }
    },
    "posts": [
        {"id": 1, "title": "First post"},
        {"id": 2, "title": "Second post"}
    ]
}) }}

{{ set('user.name', 'Bob') }}
{{ set('user.profile.age', 35) }}
{{ set('user.profile.settings.theme', 'dark') }}
{{ set('user.posts.0.title', 'Updated first post') }}
{{ set('user.profile.location', 'New York') }}
{{ set('user.interests', ['coding', 'reading']) }}

# prompt: test
## user
User: {{ get('user.name') }}, Age: {{ get('user.profile.age') }}
Theme: {{ get('user.profile.settings.theme') }}
Location: {{ get('user.profile.location') }}
First post: {{ get('user.posts.0.title') }}
Interests: {{ get('user.interests') }}
"""
        context = await start(template, basic_options)
        
        # Check that values were updated correctly
        assert context["user"]["name"] == "Bob"
        assert context["user"]["profile"]["age"] == 35
        assert context["user"]["profile"]["settings"]["theme"] == "dark"
        assert context["user"]["posts"][0]["title"] == "Updated first post"
        assert context["user"]["profile"]["location"] == "New York"
        assert context["user"]["interests"] == ["coding", "reading"]

    @pytest.mark.asyncio
    async def test_creating_nested_structures(self, basic_options):
        """Test creating nested structures with set"""
        template = """
# pre: test
{{ set('data', {}) }}
{{ set('data.user.name', 'Alice') }}
{{ set('data.user.profile.age', 30) }}
{{ set('data.items.0.name', 'First Item') }}
{{ set('data.items.1.name', 'Second Item') }}

# prompt: test
## user
Data: {{ get('data') }}
"""
        context = await start(template, basic_options)
        
        # Check that nested structure was created correctly
        assert context["data"]["user"]["name"] == "Alice"
        assert context["data"]["user"]["profile"]["age"] == 30
        assert context["data"]["items"][0]["name"] == "First Item"
        assert context["data"]["items"][1]["name"] == "Second Item"

    @pytest.mark.asyncio
    async def test_set_vs_set(self, basic_options):
        """Test that set function works the same as set_context for simple variables"""
        template = """
# pre: test
{{ set('var1', 'value1') }}
{{ set('var2', 'value2') }}

# prompt: test
## user
Comparison: {{ get('var1') }} vs {{ get('var2') }}
"""
        context = await start(template, basic_options)
        
        # Both ways should work the same for simple variables
        assert context["var1"] == "value1"
        assert context["var2"] == "value2"
        assert context["var1"] == context["var2"].replace("2", "1")


class TestAddFunction:
    """Test the add helper function that is an alias for add_context"""
    
    @pytest.mark.asyncio
    async def test_add_vs_add(self, basic_options):
        """Test that add function works the same as add_context"""
        template = """
# pre: test
{{ set('counter1', 5) }}
{{ set('counter2', 5) }}
{{ add('counter1', 3) }}
{{ add('counter2', 3) }}

# prompt: test
## user
Counter 1: {{ get('counter1') }}, Counter 2: {{ get('counter2') }}
"""
        context = await start(template, basic_options)
        
        assert context["counter1"] == 8
        assert context["counter2"] == 8
        assert context["counter1"] == context["counter2"]

    @pytest.mark.asyncio
    async def test_add_with_default(self, basic_options):
        """Test that add function correctly uses default value"""
        template = """
# pre: test
{{ add('new_counter', 5, 10) }}
{{ add('new_counter', 7) }}

# prompt: test
## user
New counter: {{ get('new_counter') }}
"""
        context = await start(template, basic_options)
        
        # First call should set new_counter to 10 + 5 = 15
        # Second call should add 7 to get 22
        assert context["new_counter"] == 22


class TestIncFunction:
    """Test the inc helper function that is an alias for inc_context"""
    
    @pytest.mark.asyncio
    async def test_inc_vs_inc(self, basic_options):
        """Test that inc function works the same as inc_context"""
        template = """
# pre: test
{{ set('counter1', 5) }}
{{ set('counter2', 5) }}
{{ inc('counter1') }}
{{ inc('counter2') }}

# prompt: test
## user
Counter 1: {{ get('counter1') }}, Counter 2: {{ get('counter2') }}
"""
        context = await start(template, basic_options)
        
        assert context["counter1"] == 6
        assert context["counter2"] == 6
        assert context["counter1"] == context["counter2"]


class TestRemContextFunction:
    """Test the rem_context helper function"""
    
    @pytest.mark.asyncio
    async def test_basic_subtraction(self, basic_options):
        """Test basic subtraction with rem_context"""
        template = """
# pre: test
{{ set('num_value', 10) }}
{{ rem('num_value', 3) }}
{{ set('float_value', 5.5) }}
{{ rem('float_value', 1.5) }}

# prompt: test
## user
Num value: {{ get('num_value', 0) }}, Float value: {{ get('float_value', 0.0) }}
"""
        context = await start(template, basic_options)
        
        assert context["num_value"] == 7  # 10 - 3
        assert context["float_value"] == 4.0  # 5.5 - 1.5
    
    @pytest.mark.asyncio
    async def test_with_default_value(self, basic_options):
        """Test rem_context with default value for non-existent variables"""
        template = """
# pre: test
{{ rem('new_counter', 5, 20) }}

# prompt: test
## user
New counter: {{ get('new_counter', 0) }}
"""
        context = await start(template, basic_options)
        
        # Should initialize with 20 and then subtract 5
        assert context["new_counter"] == 15
        
    @pytest.mark.asyncio
    async def test_sequential_operations(self, basic_options):
        """Test sequential subtraction operations"""
        template = """
# pre: test
{{ set('counter', 100) }}
{{ rem('counter', 20) }}
{{ rem('counter', 30) }}
{{ rem('counter', 10) }}

# prompt: test
## user
Counter value: {{ get('counter', 0) }}
"""
        context = await start(template, basic_options)
        
        # 100 - 20 - 30 - 10 = 40
        assert context["counter"] == 40


class TestRemFunction:
    """Test the rem helper function that is an alias for rem_context"""
    
    @pytest.mark.asyncio
    async def test_rem_vs_rem(self, basic_options):
        """Test that rem function works the same as rem_context"""
        template = """
# pre: test
{{ set('counter1', 20) }}
{{ set('counter2', 20) }}
{{ rem('counter1', 7) }}
{{ rem('counter2', 7) }}

# prompt: test
## user
Counter 1: {{ get('counter1') }}, Counter 2: {{ get('counter2') }}
"""
        context = await start(template, basic_options)
        
        assert context["counter1"] == 13  # 20 - 7
        assert context["counter2"] == 13  # 20 - 7
        assert context["counter1"] == context["counter2"]
    
    @pytest.mark.asyncio
    async def test_rem_with_default(self, basic_options):
        """Test that rem function correctly uses default value"""
        template = """
# pre: test
{{ rem('new_counter', 5, 25) }}
{{ rem('new_counter', 10) }}

# prompt: test
## user
New counter: {{ get('new_counter') }}
"""
        context = await start(template, basic_options)
        
        # First call should set new_counter to 25 - 5 = 20
        # Second call should subtract 10 to get 10
        assert context["new_counter"] == 10
        
    @pytest.mark.asyncio
    async def test_rem_with_various_types(self, basic_options):
        """Test rem with different numeric types"""
        template = """
# pre: test
{{ set('int_val', 100) }}
{{ rem('int_val', 50) }}
{{ set('float_val', 10.5) }}
{{ rem('float_val', 3.5) }}

# prompt: test
## user
Values: {{ get('int_val') }}, {{ get('float_val') }}
"""
        context = await start(template, basic_options)
        
        assert context["int_val"] == 50
        assert context["float_val"] == 7.0

    @pytest.mark.asyncio
    async def test_inc_with_default(self, basic_options):
        """Test that inc function correctly uses default value"""
        template = """
# pre: test
{{ inc('new_counter', 10) }}
{{ inc('new_counter') }}

# prompt: test
## user
New counter: {{ get('new_counter') }}
"""
        context = await start(template, basic_options)
        
        # First call should set new_counter to 10 + 1 = 11
        # Second call should increment to get 12
        assert context["new_counter"] == 12
    
    @pytest.mark.asyncio
    async def test_json_path_navigation(self, basic_options):
        """Test JSON path navigation with get"""
        template = """
# pre: test
{{ set('user', {
    "name": "Alice",
    "profile": {
        "age": 30,
        "preferences": {
            "theme": "dark",
            "notifications": True
        }
    },
    "posts": [
        {"id": 1, "title": "First post"},
        {"id": 2, "title": "Second post"}
    ]
}) }}

{{ set('user_name', get('user.name', 'unknown')) }}
{{ set('user_age', get('user.profile.age', 0)) }}
{{ set('user_theme', get('user.profile.preferences.theme', 'light')) }}
{{ set('first_post_title', get('user.posts.0.title', 'no title')) }}
{{ set('missing_property', get('user.profile.missing', 'not found')) }}
{{ set('invalid_path', get('user.invalid.path', 'invalid')) }}

# prompt: test
## user
User info: {{ get('user_name', '') }}, {{ get('user_age', 0) }}, {{ get('user_theme', '') }}
Post: {{ get('first_post_title', '') }}
Missing: {{ get('missing_property', '') }}, {{ get('invalid_path', '') }}
"""
        context = await start(template, basic_options)
        
        assert context["user_name"] == "Alice"
        assert context["user_age"] == 30
        assert context["user_theme"] == "dark"
        assert context["first_post_title"] == "First post"
        assert context["missing_property"] == "not found"
        assert context["invalid_path"] == "invalid"
    
    @pytest.mark.asyncio
    async def test_comparison_with_individual_functions(self, basic_options):
        """Test that get function works the same as calling get_context and get_json_path separately"""
        template = """
# pre: test
{{ set('data', {
    "items": [
        {"name": "first", "value": 1},
        {"name": "second", "value": 2}
    ]
}) }}

# Using get function for path navigation
{{ set('path_with_get', get('data.items.1.name', 'default')) }}

# Using the separate functions (get_context + get_json_path)
{{ set('path_with_separate', get_json_path(get('data', {}), 'items.1.name', 'default')) }}

# Simple variable access
{{ set('var_with_get', get('data', {})) }}
{{ set('var_with_get_context', get('data', {})) }}

# prompt: test
## user
Comparison test
"""
        context = await start(template, basic_options)
        
        # Check that unified get function works the same as separate functions
        assert context["path_with_get"] == "second"
        assert context["path_with_get"] == context["path_with_separate"]
        
        # Check simple variable access
        assert context["var_with_get"] == context["var_with_get_context"]


class TestDecFunction:
    """Test the dec helper function that decrements a context variable by 1"""
    
    @pytest.mark.asyncio
    async def test_basic_decrement(self, basic_options):
        """Test basic decrement functionality"""
        template = """
# pre: test
{{ set('counter', 10) }}
{{ dec('counter') }}
{{ dec('counter') }}

# prompt: test
## user
Counter value: {{ get('counter') }}
"""
        context = await start(template, basic_options)
        
        # 10 - 1 - 1 = 8
        assert context["counter"] == 8
    
    @pytest.mark.asyncio
    async def test_dec_with_default(self, basic_options):
        """Test dec with default value initialization"""
        template = """
# pre: test
{{ dec('new_counter', 20) }}
{{ dec('new_counter') }}

# prompt: test
## user
New counter: {{ get('new_counter') }}
"""
        context = await start(template, basic_options)
        
        # First call should initialize with 20 - 1 = 19
        # Second call should decrement to get 18
        assert context["new_counter"] == 18
    
    @pytest.mark.asyncio
    async def test_dec_vs_rem(self, basic_options):
        """Test that dec is equivalent to rem with value 1"""
        template = """
# pre: test
{{ set('counter1', 15) }}
{{ set('counter2', 15) }}
{{ dec('counter1') }}
{{ rem('counter2', 1) }}

# prompt: test
## user
Counter values: {{ get('counter1') }}, {{ get('counter2') }}
"""
        context = await start(template, basic_options)
        
        assert context["counter1"] == 14
        assert context["counter2"] == 14
        assert context["counter1"] == context["counter2"]
