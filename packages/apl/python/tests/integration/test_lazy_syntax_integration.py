"""
Integration tests for APL lazy syntax feature
"""

import pytest
from defuss_apl import start, check


class TestLazySyntaxIntegration:
    """Test lazy syntax in realistic scenarios"""
    
    @pytest.mark.asyncio
    async def test_complete_lazy_workflow(self):
        """Test a complete workflow using lazy syntax"""
        
        lazy_template = """
# pre: greet
set_context('user_name', 'Alice')
set_context('max_attempts', 3)
set_context('attempt_count', 0)

# prompt: greet
## system
You are a helpful assistant. Respond briefly.

## user
Hello {{ user_name }}! How are you today?

# post: greet
set_context('attempt_count', get_context('attempt_count') + 1)

if "good" in result_text.lower() or "well" in result_text.lower()
    set_context('greeting_successful', True)
    set_context('next_step', 'return')
elif get_context('attempt_count') < get_context('max_attempts')
    set_context('greeting_successful', False)
    set_context('next_step', 'greet')
else
    set_context('greeting_successful', False)
    set_context('next_step', 'return')
endif
"""
        
        # Test validation
        assert check(lazy_template, {"lazy": True}) is True
        
        # Test execution
        result = await start(lazy_template, {"lazy": True})
        
        # Verify context variables were set correctly
        assert result["user_name"] == "Alice"
        assert result["max_attempts"] == 3
        assert result["attempt_count"] >= 1
        assert "greeting_successful" in result
        assert result["result_text"] is not None
        assert len(result["result_text"]) > 0
    
    @pytest.mark.asyncio
    async def test_lazy_vs_traditional_equivalence(self):
        """Test that lazy and traditional syntax produce identical results"""
        
        # Traditional Jinja syntax
        traditional = """
# pre: test
{{ set_context('counter', 1) }}
{{ set_context('message', 'Hello World') }}

# prompt: test
## user
{{ message }}

# post: test
{% if result_text %}
    {{ set_context('response_received', True) }}
    {{ set_context('counter', get_context('counter') + 1) }}
{% else %}
    {{ set_context('response_received', False) }}
{% endif %}
"""
        
        # Equivalent lazy syntax
        lazy = """
# pre: test
set_context('counter', 1)
set_context('message', 'Hello World')

# prompt: test
## user
{{ message }}

# post: test
if result_text
    set_context('response_received', True)
    set_context('counter', get_context('counter') + 1)
else
    set_context('response_received', False)
endif
"""
        
        # Execute both
        result1 = await start(traditional)
        result2 = await start(lazy, {"lazy": True})
        
        # Compare results (excluding run-specific fields)
        compare_fields = ['counter', 'message', 'response_received']
        for field in compare_fields:
            assert result1[field] == result2[field], f"Mismatch in {field}: {result1[field]} != {result2[field]}"
    
    def test_lazy_syntax_validation_edge_cases(self):
        """Test edge cases in lazy syntax validation"""
        
        # Mixed Jinja and lazy syntax should work
        mixed_syntax = """
# pre: test
{{ set_context('traditional', 'value') }}
set_context('lazy', 'value')

# prompt: test
## user
Test prompt

# post: test
{% if condition %}
    set_context('mixed_result', 'success')
{% endif %}
if other_condition
    {{ set_context('another_result', 'success') }}
endif
"""
        
        assert check(mixed_syntax, {"lazy": True}) is True
        
        # Empty pre/post phases should work
        empty_phases = """
# pre: test

# prompt: test
## user
Test

# post: test
"""
        
        assert check(empty_phases, {"lazy": True}) is True
        
        # Comments and empty lines should be preserved
        with_comments = """
# pre: test
# This is a comment
set_context('var', 'value')

# Another comment

# prompt: test
## user
Test

# post: test
# Final comment
if condition
    set_context('result', 'done')
endif
"""
        
        assert check(with_comments, {"lazy": True}) is True
    
    @pytest.mark.asyncio
    async def test_complex_control_flow_lazy(self):
        """Test complex control flow using lazy syntax"""
        
        complex_template = """
# pre: process
set_context('items', ['apple', 'banana', 'cherry'])
set_context('processed', [])
set_context('index', 0)

# prompt: process
## user
Process item: {{ get_context('items')[get_context('index')] }}

# post: process
set_context('processed', get_context('processed') + [get_context('items')[get_context('index')]])
set_context('index', get_context('index') + 1)

if get_context('index') < len(get_context('items'))
    set_context('next_step', 'process')
else
    set_context('next_step', 'return')
    set_context('all_processed', True)
endif
"""
        
        result = await start(complex_template, {"lazy": True})
        
        assert result["items"] == ['apple', 'banana', 'cherry']
        assert result["index"] >= 1  # At least one iteration
        assert len(result["processed"]) >= 1
        assert result["result_text"] is not None
    
    def test_lazy_syntax_documentation_examples(self):
        """Test the examples from the specification"""
        
        # Example from SPEC.md
        spec_example = """
# pre: greet
set_context('user_name', 'World')
set_context('greeting', 'Hello')

# prompt: greet
## user
{{ greeting }}, {{ user_name }}!

# post: greet
if global_runs < 2 and not result_text
    set_context('next_step', 'greet')
else
    set_context('next_step', 'return')
endif
"""
        
        assert check(spec_example, {"lazy": True}) is True
        
        # Complex nested example
        nested_example = """
# pre: complex
set_context('data', {'users': ['Alice', 'Bob'], 'status': 'active'})
set_context('results', [])

# prompt: complex
## user
Process users: {{ get_context('data')['users'] }}

# post: complex
for user in get_context('data')['users']
    if get_context('data')['status'] == 'active'
        set_context('results', get_context('results') + [user + '_processed'])
    else
        set_context('results', get_context('results') + [user + '_skipped'])
    endif
endfor

if len(get_context('results')) > 0
    set_context('processing_complete', True)
    set_context('next_step', 'return')
else
    set_context('processing_complete', False)
    set_context('next_step', 'return')
endif
"""
        
        assert check(nested_example, {"lazy": True}) is True
