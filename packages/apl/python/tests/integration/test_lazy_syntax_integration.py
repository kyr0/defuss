"""
Integration tests for APL relaxed syntax feature
"""

import pytest
from defuss_apl import start, check


class TestRelaxedSyntaxIntegration:
    """Test relaxed syntax in realistic scenarios"""
    
    @pytest.mark.asyncio
    async def test_complete_relaxed_workflow(self):
        """Test a complete workflow using relaxed syntax"""
        
        relaxed_template = """
# pre: greet
set('user_name', 'Alice')
set('max_attempts', 3)
set('attempt_count', 0)

# prompt: greet
## system
You are a helpful assistant. Respond briefly.

## user
Hello {{ user_name }}! How are you today?

# post: greet
set('attempt_count', get('attempt_count') + 1)

if "good" in result_text.lower() or "well" in result_text.lower()
    set('greeting_successful', True)
    set('next_step', 'return')
elif get('attempt_count') < get('max_attempts')
    set('greeting_successful', False)
    set('next_step', 'greet')
else
    set('greeting_successful', False)
    set('next_step', 'return')
endif
"""
        
        # Test validation
        assert check(relaxed_template, {"relaxed": True}) is True
        
        # Test execution
        result = await start(relaxed_template, {"relaxed": True})
        
        # Verify context variables were set correctly
        assert result["user_name"] == "Alice"
        assert result["max_attempts"] == 3
        assert result["attempt_count"] >= 1
        assert "greeting_successful" in result
        assert result["result_text"] is not None
        assert len(result["result_text"]) > 0
    
    @pytest.mark.asyncio
    async def test_relaxed_vs_traditional_equivalence(self):
        """Test that relaxed and traditional syntax produce identical results"""
        
        # Traditional Jinja syntax
        traditional = """
# pre: test
{{ set('counter', 1) }}
{{ set('message', 'Hello World') }}

# prompt: test
## user
{{ message }}

# post: test
{% if result_text %}
    {{ set('response_received', True) }}
    {{ set('counter', get('counter') + 1) }}
{% else %}
    {{ set('response_received', False) }}
{% endif %}
"""
        
        # Equivalent relaxed syntax
        relaxed = """
# pre: test
set('counter', 1)
set('message', 'Hello World')

# prompt: test
## user
{{ message }}

# post: test
if result_text
    set('response_received', True)
    set('counter', get('counter') + 1)
else
    set('response_received', False)
endif
"""
        
        # Execute both
        result1 = await start(traditional)
        result2 = await start(relaxed, {"relaxed": True})
        
        # Compare results (excluding run-specific fields)
        compare_fields = ['counter', 'message', 'response_received']
        for field in compare_fields:
            assert result1[field] == result2[field], f"Mismatch in {field}: {result1[field]} != {result2[field]}"
    
    def test_relaxed_syntax_validation_edge_cases(self):
        """Test edge cases in relaxed syntax validation"""
        
        # Mixed Jinja and relaxed syntax should work
        mixed_syntax = """
# pre: test
{{ set('traditional', 'value') }}
set('relaxed', 'value')

# prompt: test
## user
Test prompt

# post: test
{% if condition %}
    set('mixed_result', 'success')
{% endif %}
if other_condition
    {{ set('another_result', 'success') }}
endif
"""
        
        assert check(mixed_syntax, {"relaxed": True}) is True
        
        # Empty pre/post phases should work
        empty_phases = """
# pre: test

# prompt: test
## user
Test

# post: test
"""
        
        assert check(empty_phases, {"relaxed": True}) is True
        
        # Comments and empty lines should be preserved
        with_comments = """
# pre: test
# This is a comment
set('var', 'value')

# Another comment

# prompt: test
## user
Test

# post: test
# Final comment
if condition
    set('result', 'done')
endif
"""
        
        assert check(with_comments, {"relaxed": True}) is True
    
    @pytest.mark.asyncio
    async def test_complex_control_flow_relaxed(self):
        """Test complex control flow using relaxed syntax"""
        
        complex_template = """
# pre: process
set('items', ['apple', 'banana', 'cherry'])
set('processed', [])
set('index', 0)

# prompt: process
## user
Process item: {{ get('items')[get('index')] }}

# post: process
set('processed', get('processed') + [get('items')[get('index')]])
set('index', get('index') + 1)

if get('index') < len(get('items'))
    set('next_step', 'process')
else
    set('next_step', 'return')
    set('all_processed', True)
endif
"""
        
        result = await start(complex_template, {"relaxed": True})
        
        assert result["items"] == ['apple', 'banana', 'cherry']
        assert result["index"] >= 1  # At least one iteration
        assert len(result["processed"]) >= 1
        assert result["result_text"] is not None
    
    def test_relaxed_syntax_documentation_examples(self):
        """Test the examples from the specification"""
        
        # Example from SPEC.md
        spec_example = """
# pre: greet
set('user_name', 'World')
set('greeting', 'Hello')

# prompt: greet
## user
{{ greeting }}, {{ user_name }}!

# post: greet
if global_runs < 2 and not result_text
    set('next_step', 'greet')
else
    set('next_step', 'return')
endif
"""
        
        assert check(spec_example, {"relaxed": True}) is True
        
        # Complex nested example
        nested_example = """
# pre: complex
set('data', {'users': ['Alice', 'Bob'], 'status': 'active'})
set('results', [])

# prompt: complex
## user
Process users: {{ get('data')['users'] }}

# post: complex
for user in get('data')['users']
    if get('data')['status'] == 'active'
        set('results', get('results') + [user + '_processed'])
    else
        set('results', get('results') + [user + '_skipped'])
    endif
endfor

if len(get('results')) > 0
    set('processing_complete', True)
    set('next_step', 'return')
else
    set('processing_complete', False)
    set('next_step', 'return')
endif
"""
        
        assert check(nested_example, {"relaxed": True}) is True
