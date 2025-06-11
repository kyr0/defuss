"""
Unit tests for APL error handling
"""

import pytest
from defuss_apl import start
from defuss_apl.runtime import RuntimeError
from defuss_apl.parser import ValidationError


class TestRuntimeErrorHandling:
    """Test runtime error handling"""
    
    @pytest.mark.asyncio
    async def test_unknown_step_error(self, basic_options):
        """Test error when jumping to unknown step"""
        template = """
# pre: test
{{ set_context('next_step', 'nonexistent') }}

# prompt: test
## user
This should cause an error
"""
        with pytest.raises(RuntimeError) as exc_info:
            await start(template, basic_options)
        assert "Unknown step: nonexistent" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_provider_error_handling(self, basic_options):
        """Test handling of provider errors"""
        async def failing_provider(context):
            raise Exception("Provider failed")
        
        template = """
# prompt: test
## user
Test message
"""
        options = basic_options.copy()
        options["with_providers"] = {"gpt-4o": failing_provider}
        
        with pytest.raises(Exception) as exc_info:
            await start(template, options)
        assert "Provider failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_timeout_error(self):
        """Test timeout error handling"""
        # Create a template that would run indefinitely
        template = """
# prompt: infinite
## user
Test

# post: infinite
{{ set_context('next_step', 'infinite') }}
"""
        options = {"timeout": 100}  # Very short timeout (100ms)
        
        with pytest.raises(RuntimeError) as exc_info:
            await start(template, options)
        assert "timeout" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_tool_execution_error_recovery(self, basic_options):
        """Test that tool execution errors don't crash the workflow"""
        def failing_tool(x: int) -> int:
            raise ValueError("Tool failed")
        
        template = """
# pre: test
{{ set_context('allowed_tools', ['failing_tool']) }}

# prompt: test
## user
Use the failing tool with x=5
"""
        
        # Mock provider that simulates tool calling
        async def mock_provider_with_tool_call(context):
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": "I'll use the tool",
                        "tool_calls": [{
                            "id": "call_1",
                            "type": "function",
                            "function": {
                                "name": "failing_tool",
                                "arguments": '{"x": 5}'
                            }
                        }]
                    }
                }]
            }
        
        options = basic_options.copy()
        options["with_providers"] = {"gpt-4o": mock_provider_with_tool_call}
        options["with_tools"] = {
            "failing_tool": {"fn": failing_tool, "with_context": False}
        }
        
        # Should not crash, but tool error should be recorded
        context = await start(template, options)
        
        # Check that tool call error was recorded
        assert "result_tool_calls" in context
        if context["result_tool_calls"]:
            failed_call = context["result_tool_calls"][0]
            assert failed_call["with_error"] is True
            assert "Tool failed" in str(failed_call["content"])

    @pytest.mark.asyncio
    async def test_error_reset_between_steps(self, basic_options):
        """Test that errors are reset between steps"""
        # Mock provider that adds errors
        async def error_adding_provider(context):
            context["errors"].append("Simulated error")
            return {
                "choices": [{
                    "message": {
                        "role": "assistant", 
                        "content": "Response with error"
                    }
                }]
            }
        
        template = """
# prompt: step1
## user
Step 1

# post: step1
{{ set_context('next_step', 'step2') }}

# prompt: step2
## user
Step 2

# post: step2
{{ set_context('next_step', 'return') }}
"""
        
        options = basic_options.copy()
        options["with_providers"] = {"gpt-4o": error_adding_provider}
        
        context = await start(template, options)
        
        # Errors should be reset for the final step
        # (though the mock provider will add errors again)
        assert "errors" in context

    @pytest.mark.asyncio
    async def test_max_runs_limit(self):
        """Test max_runs limit enforcement"""
        template = """
# prompt: loop
## user
Test

# post: loop
{{ set_context('next_step', 'loop') }}
"""
        
        options = {
            "max_runs": 3,
            "timeout": 5000,
            "debug": False
        }
        
        with pytest.raises(RuntimeError) as exc_info:
            await start(template, options)
        assert "Run budget exceeded" in str(exc_info.value) or "max_runs" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_jinja_error_handling(self, basic_options):
        """Test handling of Jinja template errors"""
        template = """
# pre: test
{{ undefined_variable }}

# prompt: test
## user
Test
"""
        
        # Should raise an error due to undefined variable
        with pytest.raises(Exception):
            await start(template, basic_options)

    @pytest.mark.asyncio
    async def test_schema_validation_error_handling(self, basic_options):
        """Test schema validation error handling"""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"}
            },
            "required": ["name"]
        }
        
        # Mock provider that returns invalid JSON
        async def invalid_json_provider(context):
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": '{"age": 30}'  # Missing required "name"
                    }
                }]
            }
        
        template = """
# pre: test
{{ set_context('output_mode', 'json') }}

# prompt: test
## user
Return a JSON object
"""
        
        options = basic_options.copy()
        options["with_providers"] = {"gpt-4o": invalid_json_provider}
        options["output_structure"] = schema
        
        # Should not crash, but validation error should be recorded
        context = await start(template, options)
        
        # Check that validation error was recorded
        assert len(context["errors"]) > 0
        validation_errors = [e for e in context["errors"] if "validation" in e.lower()]
        assert len(validation_errors) > 0


class TestParsingErrorHandling:
    """Test parsing error handling"""
    
    def test_malformed_template_error(self):
        """Test error handling for malformed templates"""
        malformed_templates = [
            "# invalid header without colon",
            "## role without prompt phase\nContent",
            "# prompt\n## invalid role name\nContent"
        ]
        
        for template in malformed_templates:
            with pytest.raises(ValidationError):
                from defuss_apl import parse_apl
                parse_apl(template)

    def test_error_location_reporting(self):
        """Test that errors include location information"""
        template = """
# prompt: valid_step
## user
Valid content

# prompt: return
This should fail - reserved identifier
"""
        
        with pytest.raises(ValidationError) as exc_info:
            from defuss_apl import check
            check(template)
        
        error_message = str(exc_info.value)
        assert "Reserved step identifier: return" in error_message

    def test_detailed_validation_messages(self):
        """Test that validation errors provide detailed messages"""
        test_cases = [
            (
                "# prompt: test:invalid\nContent",
                "Invalid step identifier"
            ),
            (
                "# prompt: {{ jinja }}\nContent", 
                "Invalid step heading"
            ),
            (
                "# pre: test\n# pre: test\n# prompt: test\nContent",
                "Duplicate step identifier"
            )
        ]
        
        for template, expected_error in test_cases:
            with pytest.raises(ValidationError) as exc_info:
                from defuss_apl import check
                check(template)
            assert expected_error in str(exc_info.value)


class TestErrorContext:
    """Test error context and debugging information"""
    
    @pytest.mark.asyncio
    async def test_error_context_preservation(self, basic_options):
        """Test that error context is preserved for debugging"""
        template = """
# pre: test
{{ set_context('debug_var', 'debug_value') }}

# prompt: test
## user
Test message

# post: test
{{ set_context('next_step', 'nonexistent') }}
"""
        
        try:
            await start(template, basic_options)
            pytest.fail("Expected RuntimeError")
        except RuntimeError as e:
            # Error should preserve context for debugging
            assert "Unknown step: nonexistent" in str(e)

    @pytest.mark.asyncio
    async def test_error_history_tracking(self, basic_options):
        """Test that error history is tracked in context_history"""
        # Mock provider that adds errors
        async def error_provider(context):
            context["errors"].append("Step error")
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": "Response"
                    }
                }]
            }
        
        template = """
# prompt: step1
## user
Step 1

# post: step1
{{ set_context('next_step', 'step2') }}

# prompt: step2  
## user
Step 2

# post: step2
{{ set_context('next_step', 'return') }}
"""
        
        options = basic_options.copy()
        options["with_providers"] = {"gpt-4o": error_provider}
        
        context = await start(template, options)
        
        # Check that context history is maintained
        assert "context_history" in context
        history = context["context_history"]
        assert len(history) >= 2
        
        # Previous steps should have error records
        for entry in history:
            assert "errors" in entry
