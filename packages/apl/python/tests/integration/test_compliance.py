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
{{ set_context('test_var', 'from_step1') }}

# prompt: step1
## user
Test message 1

# prompt: step2
## user
Test message 2
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
{{ set_context('test_data', {"user": {"name": "Alice", "items": [1, 2, 3]}}) }}
{{ set_context('name', get_json_path(test_data, "user.name", "unknown")) }}
{{ set_context('missing', get_json_path(test_data, "user.missing", "default")) }}
{{ set_context('item', get_json_path(test_data, "user.items.1", "none")) }}

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
{{ set_context('next_step', "nonexistent") }}

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
{{ set_context('user_name', 'Alice') }}
{{ set_context('step_count', 0) }}

# prompt: setup
## user
Initialize with name {{ user_name }}

# post: setup
{{ set_context('step_count', step_count + 1) }}
{{ set_context('next_step', 'process') }}

# pre: process
{{ set_context('step_count', step_count + 1) }}

# prompt: process
## user
Process data for {{ user_name }}

# post: process
{{ set_context('step_count', step_count + 1) }}
{{ set_context('next_step', 'finalize') }}

# pre: finalize
{{ set_context('step_count', step_count + 1) }}

# prompt: finalize
## user
Finalize for {{ user_name }}

# post: finalize
{{ set_context('step_count', step_count + 1) }}
"""
        
        context = await start(template, {"debug": False})
        
        assert context["user_name"] == "Alice"
        assert context["step_count"] == 5  # 5 phase executions
        assert len(context["context_history"]) == 3  # 3 steps

    @pytest.mark.asyncio
    async def test_conditional_branching(self):
        """Test conditional step branching"""
        template = """
# pre: start
{{ set_context('condition', True) }}

# prompt: start
## user
Start

# post: start
{% if condition %}
{{ set_context('next_step', 'success_path') }}
{% else %}
{{ set_context('next_step', 'failure_path') }}
{% endif %}

# prompt: success_path
## user
Success path taken

# prompt: failure_path
## user
Failure path taken
"""
        
        context = await start(template, {"debug": False})
        
        assert "Success path taken" in context["result_text"]
        assert "Failure path taken" not in context["result_text"]

    @pytest.mark.asyncio
    async def test_error_recovery_workflow(self):
        """Test error recovery in workflows"""
        template = """
# prompt: main
## user
Main operation

# post: main
{% if errors %}
{{ set_context('next_step', 'error_handler') }}
{% else %}
{{ set_context('next_step', 'success') }}
{% endif %}

# prompt: error_handler
## user
Handle errors

# prompt: success
## user
Success
"""
        
        context = await start(template, {"debug": False})
        
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
        template = """
# prompt: only_step
## user
Single step
"""
        
        context = await start(template, {"debug": False})
        
        # Should complete without explicit return
        assert context["result_text"] is not None
        assert context["prev_step"] == "only_step"

    @pytest.mark.asyncio
    async def test_circular_reference_detection(self):
        """Test circular reference handling"""
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
{{ set_context('next_step', 'step1') }}
"""
        
        options = {"timeout": 1000, "max_runs": 5}  # Limit to prevent infinite loop
        
        with pytest.raises(Exception):  # Should timeout or hit max_runs
            await start(template, options)
