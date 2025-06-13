"""
Integration tests for APL compliance with specification v1.1
"""

import pytest
from defuss_apl import parse_apl, start
from defuss_apl.parser import ValidationError
from defuss_apl.tools import describe_tools, call_tools, validate_schema


class TestSpecificationCompliance:
    """Test compliance with APL specification v1.1"""
    
    def test_step_heading_validation(self):
        """Test §1.1 Step Heading validation"""
        # Test reserved identifier
        with pytest.raises(ValidationError) as exc_info:
            parse_apl("# prompt: return\nTest")
        assert "Reserved step identifier: return" in str(exc_info.value)
        
        # Test duplicate identifiers
        with pytest.raises(ValidationError) as exc_info:
            parse_apl("# pre: test\n# prompt: test\n# pre: test\n")
        assert "Duplicate step identifier" in str(exc_info.value)
        
        # Test invalid identifier with colons/hashes
        with pytest.raises(ValidationError) as exc_info:
            parse_apl("# prompt: test:name\nTest")
        assert "Invalid step identifier" in str(exc_info.value)
        
        # Test Jinja in heading
        with pytest.raises(ValidationError) as exc_info:
            parse_apl("# prompt: {{ variable }}\nTest")
        assert "Invalid step heading" in str(exc_info.value)

    def test_role_concatenation(self):
        """Test §1.2 Role concatenation"""
        template = """
# prompt: test

## system
First system message.

## user
User message.

## system
Second system message.
"""
        
        steps = parse_apl(template)
        step = steps["test"]
        
        # Check if duplicate system roles are concatenated
        system_content = step.prompt.roles.get("system", "")
        assert "First system message.\nSecond system message." in system_content
        
        # Check role_list for distinct messages
        assert hasattr(step.prompt, 'role_list')
        role_list = step.prompt.role_list
        
        # Should have 3 distinct messages: system, user, system
        assert len(role_list) == 3
        assert role_list[0] == ("system", "First system message.")
        assert role_list[1] == ("user", "User message.")
        assert role_list[2] == ("system", "Second system message.")

    @pytest.mark.asyncio
    async def test_attachment_processing(self):
        """Test §1.2.1 Attachment processing"""
        template = """
# prompt: test

## user
Here's an image:
@image_url https://example.com/image.jpg
And some text after.
"""
        
        context = await start(template, {"debug": False})
        prompts = context.get("prompts", [])
        
        assert len(prompts) > 0
        user_message = next((p for p in prompts if p["role"] == "user"), None)
        assert user_message is not None
        
        # Check that attachment directive is preserved
        if isinstance(user_message["content"], str):
            assert "@image_url https://example.com/image.jpg" in user_message["content"]
        elif isinstance(user_message["content"], list):
            # Should have text and image_url parts
            text_parts = [p for p in user_message["content"] if p["type"] == "text"]
            image_parts = [p for p in user_message["content"] if p["type"] == "image_url"]
            assert len(text_parts) > 0
            assert len(image_parts) > 0

    @pytest.mark.asyncio
    async def test_variable_lifecycle(self):
        """Test §2.3 Variable lifecycle"""
        template = """
# pre: step1
{{ set('test_var', 'from_step1') }}

# prompt: step1
## user
Test message 1

# post: step1
{{ set('next_step', 'step2') }}

# prompt: step2
## user
Test message 2

# post: step2
{{ set('next_step', 'return') }}
"""
        
        context = await start(template, {"debug": False})
        
        # Check that errors were reset between steps
        assert context.get("errors") == []
        
        # Check context history
        history = context.get("context_history", [])
        assert len(history) >= 2
        
        # Check that variables persist
        assert context.get("test_var") == "from_step1"

    def test_tool_calling(self):
        """Test §5 Tool calling"""
        def calc(x: int, y: int) -> int:
            """Add two integers and return the sum."""
            return x + y
        
        # Test tool description generation
        context = {
            "with_tools": {
                "calc": {
                    "fn": calc,
                    "with_context": False
                }
            },
            "allowed_tools": ["calc"]
        }
        
        tools = describe_tools(context)
        
        assert tools
        tool = tools[0]
        assert tool["type"] == "function"
        
        function_def = tool["function"]
        assert function_def["name"] == "calc"
        
        # Check parameters
        params = function_def["parameters"]
        assert params["type"] == "object"
        assert "x" in params["properties"] and "y" in params["properties"]
        assert params["properties"]["x"]["type"] == "integer"

    @pytest.mark.asyncio
    async def test_json_helper(self):
        """Test §7.4 JSON helper function"""
        template = """
# pre: test
{{ set('test_data', {"user": {"name": "Alice", "items": [1, 2, 3]}}) }}
{{ set('name', get_json_path(get('test_data', {}), "user.name", "unknown")) }}
{{ set('missing', get_json_path(get('test_data', {}), "user.missing", "default")) }}
{{ set('item', get_json_path(get('test_data', {}), "user.items.1", "none")) }}

# prompt: test
## user
Debug output
"""
        
        context = await start(template, {"debug": False})
        
        name = context.get("name")
        missing = context.get("missing") 
        item = context.get("item")
        
        assert name == "Alice"
        assert missing == "default"
        assert item == 2  # items[1] should be 2

    def test_schema_validation(self):
        """Test schema validation"""
        # Test basic schema validation
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            },
            "required": ["name"]
        }
        
        context = {"errors": [], "output_structure": schema}
        
        # Valid data
        valid_data = {"name": "John", "age": 30}
        result = validate_schema(valid_data, context)
        assert result is True
        
        # Invalid data - missing required field
        context = {"errors": [], "output_structure": schema}
        invalid_data = {"age": 30}
        result = validate_schema(invalid_data, context)
        assert result is False
        
        # Check that error was recorded
        assert context["errors"]

    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test error handling and messages"""
        # Test unknown step error
        template = """
# pre: step1
{{ set('next_step', "nonexistent") }}

# prompt: step1
## user
Test
"""
        
        with pytest.raises(Exception) as exc_info:
            await start(template, {"debug": False})
        assert "Unknown step: nonexistent" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_context_variables(self):
        """Test §2.4 Executor-maintained variables"""
        template = """
# prompt: test
## user
Simple test
"""
        
        context = await start(template, {"debug": False})
        
        # Check required executor variables
        required_vars = [
            "prev_step", "result_text", "result_role", "runs", 
            "global_runs", "time_elapsed", "time_elapsed_global",
            "errors", "context", "context_history"
        ]
        
        for var in required_vars:
            assert var in context, f"Missing required variable: {var}"
        
        # Check variable types
        assert isinstance(context["runs"], int)
        assert isinstance(context["global_runs"], int)
        assert isinstance(context["time_elapsed"], (int, float))
        assert isinstance(context["time_elapsed_global"], (int, float))
        assert isinstance(context["errors"], list)
        assert isinstance(context["context_history"], list)

    @pytest.mark.asyncio
    async def test_multimodal_content(self):
        """Test §3 Prompt message schema with multimodal content"""
        template = """
# prompt: test
## user
Text content
@image_url https://example.com/image.jpg
@audio_input https://example.com/audio.mp3
@file https://example.com/document.pdf
More text
"""
        
        context = await start(template, {"debug": False})
        prompts = context.get("prompts", [])
        
        assert len(prompts) > 0
        user_message = next((p for p in prompts if p["role"] == "user"), None)
        assert user_message is not None
        
        # Content should either be a string (with directives) or array of content parts
        content = user_message["content"]
        if isinstance(content, list):
            # Check for different content types
            content_types = {part["type"] for part in content}
            assert "text" in content_types
            # May also have image_url, audio_input, file types


class TestWorkflowExecution:
    """Test complete workflow execution scenarios"""
    
    @pytest.mark.asyncio
    async def test_multi_step_workflow(self):
        """Test multi-step workflow execution"""
        template = """
# pre: setup
{{ set('user_name', 'Alice') }}
{{ set('step_count', 0) }}

# prompt: setup
## user
Initialize with name {{ get('user_name', 'User') }}

# post: setup
{{ set('step_count', get('step_count', 0) + 1) }}
{{ set('next_step', 'process') }}

# pre: process
{{ set('step_count', get('step_count', 0) + 1) }}

# prompt: process
## user
Process data for {{ get('user_name', 'User') }}

# post: process
{{ set('step_count', get('step_count', 0) + 1) }}
{{ set('next_step', 'finalize') }}

# pre: finalize
{{ set('step_count', get('step_count', 0) + 1) }}

# prompt: finalize
## user
Finalize for {{ get('user_name', 'User') }}

# post: finalize
{{ set('step_count', get('step_count', 0) + 1) }}
"""
        
        context = await start(template, {"debug": False})
        
        assert context["user_name"] == "Alice"
        assert context["step_count"] == 5  # 5 phase executions
        assert len(context["context_history"]) == 3  # 3 steps

    @pytest.mark.asyncio
    async def test_conditional_branching(self):
        """Test conditional step branching"""
        from defuss_apl.test_utils import create_echo_provider
        
        template = """
# pre: start
{{ set('condition', True) }}

# prompt: start
## user
Start

# post: start
{% if get('condition', False) %}
{{ set('next_step', 'success_path') }}
{% else %}
{{ set('next_step', 'failure_path') }}
{% endif %}

# prompt: success_path
## user
Success path taken

# post: success_path
{{ set('next_step', 'return') }}

# prompt: failure_path
## user
Failure path taken

# post: failure_path
{{ set('next_step', 'return') }}
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": create_echo_provider()}
        })
        
        assert "Success path taken" in context["result_text"]
        assert "Failure path taken" not in context["result_text"]

    @pytest.mark.asyncio
    async def test_error_recovery_workflow(self):
        """Test error recovery in workflows"""
        from defuss_apl.test_utils import create_echo_provider
        
        template = """
# prompt: main
## user
Main operation

# post: main
{% if errors %}
{{ set('next_step', 'error_handler') }}
{% else %}
{{ set('next_step', 'success') }}
{% endif %}

# prompt: error_handler
## user
Handle errors

# prompt: success
## user
Success
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": create_echo_provider()}
        })
        
        # Should complete successfully
        assert context["result_text"] is not None
        # Should go to success path if no errors
        if not context["errors"]:
            assert "Success" in context["result_text"]


class TestSpecificationEdgeCases:
    """Test edge cases and boundary conditions from specification"""
    
    @pytest.mark.asyncio
    async def test_empty_phases(self):
        """Test handling of empty phases"""
        template = """
# pre: test

# prompt: test
## user
Test

# post: test
"""
        
        context = await start(template, {"debug": False})
        assert context["result_text"] is not None

    @pytest.mark.asyncio
    async def test_whitespace_tolerance(self):
        """Test whitespace tolerance in headings"""
        template = """
#   pre   :   test   

#  prompt  :  test  
##   user   
Hello

#   post   :   test   
"""
        
        context = await start(template, {"debug": False})
        assert context["result_text"] is not None

    def test_role_case_insensitivity(self):
        """Test role case insensitivity"""
        template = """
# prompt: test
## SYSTEM
System message
## User
User message
## ASSISTANT
Assistant message
"""
        
        steps = parse_apl(template)
        step = steps["test"]
        
        # Should have all roles (case-insensitive)
        assert "system" in step.prompt.roles
        assert "user" in step.prompt.roles
        assert "assistant" in step.prompt.roles

    @pytest.mark.asyncio
    async def test_implicit_return(self):
        """Test implicit return at end of template"""
        from defuss_apl.test_utils import create_echo_provider
        
        template = """
# prompt: only_step
## user
Single step
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": create_echo_provider()}
        })
        
        # Should complete without explicit return
        assert context["result_text"] is not None
        # For a single step, prev_step should be None and current_step should be the step name
        assert context["prev_step"] is None
        assert context["current_step"] == "only_step"

    @pytest.mark.asyncio
    async def test_circular_reference_detection(self):
        """Test circular reference handling"""
        template = """
# prompt: step1
## user
Step 1

# post: step1
{{ set('next_step', 'step2') }}

# prompt: step2
## user
Step 2

# post: step2
{{ set('next_step', 'step1') }}
"""
        
        options = {"timeout": 1000, "max_runs": 5}  # Limit to prevent infinite loop
        
        with pytest.raises(Exception):  # Should timeout or hit max_runs
            await start(template, options)

    @pytest.mark.asyncio
    async def test_explicit_termination_behavior(self):
        """Test §2.1 Explicit termination behavior when next_step is not set"""
        from defuss_apl.test_utils import create_echo_provider
        
        template = """
# prompt: step1
## user
Step 1

# prompt: step2
## user  
Step 2

# prompt: step3
## user
Step 3
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": create_echo_provider()}
        })
        
        # Should terminate after step1 since no next_step is set (explicit termination)
        assert "Step 1" in context["result_text"]
        assert "Step 2" not in context["result_text"]
        assert "Step 3" not in context["result_text"]
        assert len(context["context_history"]) == 1

    @pytest.mark.asyncio
    async def test_explicit_return_termination(self):
        """Test §2.1 Explicit 'return' termination"""
        from defuss_apl.test_utils import create_echo_provider
        
        template = """
# prompt: step1
## user
Step 1

# post: step1
{{ set('next_step', 'return') }}

# prompt: step2
## user
Step 2 (should not execute)
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": create_echo_provider()}
        })
        
        # Should terminate after step1 and not execute step2
        assert "Step 1" in context["result_text"]
        assert "Step 2" not in context["result_text"]
        assert len(context["context_history"]) == 1

    def test_role_defaults_to_user(self):
        """Test §1.2 Missing roles default to user"""
        template = """
# prompt: test
This should default to user role
"""
        
        steps = parse_apl(template)
        step = steps["test"]
        
        # Should have user role
        assert "user" in step.prompt.roles
        assert step.prompt.roles["user"] == "This should default to user role"

    @pytest.mark.asyncio
    async def test_user_settable_variables(self):
        """Test §2.5 User-settable variables"""
        template = """
# pre: test
{{ set('model', 'gpt-3.5-turbo') }}
{{ set('temperature', 0.7) }}
{{ set('max_tokens', 100) }}
{{ set('allowed_tools', ['calc']) }}
{{ set('output_mode', 'text') }}

# prompt: test
## user
Test with custom settings
"""
        
        context = await start(template, {"debug": False})
        
        # Check that user-settable variables are preserved
        assert context["model"] == "gpt-3.5-turbo"
        assert context["temperature"] == 0.7
        assert context["max_tokens"] == 100
        assert context["allowed_tools"] == ['calc']
        assert context["output_mode"] == "text"

    @pytest.mark.asyncio
    async def test_output_mode_json(self):
        """Test JSON output mode validation"""
        from defuss_apl.test_utils import create_echo_provider
        
        template = """
# pre: test
{{ set('output_mode', 'json') }}

# prompt: test
## user
Return JSON data
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": create_echo_provider()}
        })
        
        assert context["output_mode"] == "json"

    @pytest.mark.asyncio
    async def test_token_usage_tracking(self):
        """Test §2.4 Token usage tracking"""
        template = """
# prompt: test
## user
Test token usage
"""
        
        context = await start(template, {"debug": False})
        
        # Usage should be present (even if None from mock provider)
        assert "usage" in context
        # runs and global_runs should be incremented
        assert context["runs"] >= 1
        assert context["global_runs"] >= 1

    @pytest.mark.asyncio
    async def test_max_runs_enforcement(self):
        """Test max_runs option enforcement"""
        template = """
# prompt: loop
## user
Loop iteration

# post: loop
{{ set('next_step', 'loop') }}
"""
        
        options = {"max_runs": 3, "timeout": 5000}
        
        with pytest.raises(Exception) as exc_info:
            await start(template, options)
        assert "Run budget exceeded" in str(exc_info.value) or "timeout" in str(exc_info.value).lower()

class TestProviderCompliance:
    """Test provider compliance with SPEC requirements"""
    
    @pytest.mark.asyncio
    async def test_provider_exception_handling(self):
        """Test §2.2 Provider exception handling"""
        
        async def failing_provider(context):
            """Provider that raises an exception"""
            raise RuntimeError("Provider failed")
        
        template = """
# prompt: test
## user
Test provider failure
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": failing_provider}
        })
        
        # Provider errors should be captured in errors list, not crash execution
        assert len(context["errors"]) > 0
        error_found = any("Provider failed" in error for error in context["errors"])
        assert error_found

    @pytest.mark.asyncio
    async def test_tool_call_error_handling(self):
        """Test §2.2.2 Tool call error handling"""
        
        def failing_tool(x: int) -> int:
            """Tool that always fails"""
            raise ValueError("Tool execution failed")
        
        # Mock provider that returns tool calls
        async def tool_calling_provider(context):
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": "I'll use the tool",
                        "tool_calls": [{
                            "id": "call_123",
                            "type": "function",
                            "function": {
                                "name": "failing_tool",
                                "arguments": '{"x": 5}'
                            }
                        }]
                    }
                }]
            }
        
        template = """
# prompt: test
## user
Test tool error handling
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": tool_calling_provider},
            "with_tools": {
                "failing_tool": {
                    "fn": failing_tool,
                    "with_context": False
                }
            }
        })
        
        # Execution should continue despite tool failure
        assert context["result_text"] is not None
        # Tool error should be recorded
        if context.get("result_tool_calls"):
            tool_result = context["result_tool_calls"][0]
            assert tool_result.get("with_error") is True

    @pytest.mark.asyncio
    async def test_explicit_step_transitions(self):
        """Test explicit step transitions to achieve sequential execution"""
        from defuss_apl.test_utils import create_echo_provider
        
        template = """
# prompt: step1
## user
Step 1

# post: step1
{{ set('next_step', 'step2') }}

# prompt: step2
## user  
Step 2

# post: step2
{{ set('next_step', 'step3') }}

# prompt: step3
## user
Step 3
"""
        
        context = await start(template, {
            "debug": False,
            "with_providers": {"gpt-4o": create_echo_provider()}
        })
        
        # Should execute all steps with explicit transitions
        assert "Step 3" in context["result_text"]
        assert len(context["context_history"]) == 3
