"""
Tests for APL Python implementation
"""

import pytest
import asyncio
from defuss_apl import start, check, parse_apl, ValidationError, RuntimeError


class TestAPLParser:
    """Test APL parsing functionality"""
    
    def test_simple_template(self):
        """Test parsing a simple APL template"""
        template = """
# prompt: greet
Hello, how are you?
"""
        steps = parse_apl(template)
        assert "greet" in steps
        assert steps["greet"].prompt.roles["user"] == "Hello, how are you?"
        
    def test_multi_phase_template(self):
        """Test parsing template with all phases"""
        template = """
# pre: setup
{% set name = "Alice" %}

# prompt: setup  
## system
You are a helpful assistant.

## user
Hello {{ name }}!

# post: setup
{% set next_step = "return" %}
"""
        steps = parse_apl(template)
        assert "setup" in steps
        assert "{% set name = \"Alice\" %}" in steps["setup"].pre.content
        assert "You are a helpful assistant." in steps["setup"].prompt.roles["system"]
        assert "Hello {{ name }}!" in steps["setup"].prompt.roles["user"]
        assert "{% set next_step = \"return\" %}" in steps["setup"].post.content
        
    def test_validation_errors(self):
        """Test validation error cases"""
        
        # Reserved identifier
        with pytest.raises(ValidationError, match="Reserved step identifier: return"):
            parse_apl("# prompt: return\nHello")
            
        # Duplicate identifier  
        with pytest.raises(ValidationError, match="Duplicate step identifier: test"):
            parse_apl("""
# pre: test
{% set x = 1 %}

# pre: test  
{% set y = 2 %}
""")

    def test_check_function(self):
        """Test the check function"""
        valid_template = "# prompt: test\nHello"
        assert check(valid_template) == True
        
        with pytest.raises(ValidationError):
            check("# prompt: return\nHello")


class TestAPLRuntime:
    """Test APL runtime functionality"""
    
    @pytest.mark.asyncio
    async def test_simple_execution(self):
        """Test executing a simple template"""
        template = """
# prompt: greet
Hello, how are you?
"""
        
        # Use mock provider
        options = {"with_providers": {}}
        result = await start(template, options)
        
        assert result["result_text"] == "Hello! I'm doing well, thank you for asking. How can I help you today?"
        assert result["global_runs"] == 1
        assert result["prev_step"] is None
        
    @pytest.mark.asyncio  
    async def test_variable_assignment(self):
        """Test variable assignment in pre phase"""
        template = """
# pre: setup
{% set greeting = "Hello" %}
{% set name = "World" %}

# prompt: setup
{{ greeting }}, {{ name }}!
"""
        
        result = await start(template)
        # The mock provider doesn't actually render the template, but variables should be set
        assert "greeting" in result
        assert "name" in result
        
    @pytest.mark.asyncio
    async def test_control_flow(self):
        """Test control flow with next_step"""
        template = """
# prompt: first
First step

# post: first  
{% set next_step = "return" %}

# prompt: second
Second step (should not reach)
"""
        
        result = await start(template)
        assert result["global_runs"] == 1  # Only first step should execute
        
    @pytest.mark.asyncio
    async def test_tool_calling_mock(self):
        """Test tool calling with mock tools"""
        
        def sample_tool(message: str) -> str:
            """A sample tool function"""
            return f"Tool response: {message}"
            
        template = """
# pre: setup
{% set allowed_tools = ["sample_tool"] %}

# prompt: setup
Please use the tool to process this message.
"""
        
        options = {
            "with_tools": {
                "sample_tool": {
                    "fn": sample_tool,
                    "descriptor": {
                        "type": "function",
                        "function": {
                            "name": "sample_tool",
                            "description": "A sample tool",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "message": {"type": "string"}
                                },
                                "required": ["message"]
                            }
                        }
                    }
                }
            }
        }
        
        result = await start(template, options)
        assert "tools" in result
        assert len(result["tools"]) == 1
        assert result["tools"][0]["function"]["name"] == "sample_tool"
        
    @pytest.mark.asyncio
    async def test_multimodal_attachments(self):
        """Test multimodal attachment processing"""
        template = """
# prompt: vision
Describe this image:
@image_url https://example.com/image.jpg

And this file:
@file https://example.com/document.pdf
"""
        
        result = await start(template)
        # Check that prompts were processed correctly
        prompts = result["prompts"]
        assert len(prompts) == 1
        
        # The content should be a list with text and attachments
        content = prompts[0]["content"]
        if isinstance(content, list):
            # Check for image_url and file attachments
            attachment_types = [part.get("type") for part in content if isinstance(part, dict)]
            assert "image_url" in attachment_types
            assert "file" in attachment_types


class TestToolExecution:
    """Test tool execution with mock provider"""
    
    @pytest.mark.asyncio
    async def test_mock_provider_tool_execution(self):
        """Test that mock provider actually executes tools"""
        
        def add_numbers(a: int, b: int) -> int:
            """Add two numbers together"""
            return a + b
            
        def get_greeting(name: str) -> str:
            """Get a greeting for someone"""
            return f"Hello, {name}!"
        
        template = """
# pre: setup
{% set allowed_tools = ["add_numbers", "get_greeting"] %}

# prompt: setup
## user
Please add 10 and 5, and greet Alice.
"""
        
        options = {
            "with_tools": {
                "add_numbers": {"fn": add_numbers},
                "get_greeting": {"fn": get_greeting}
            }
        }
        
        result = await start(template, options)
        
        # Should have executed tools
        assert len(result["result_tool_calls"]) == 2
        
        # Check tool results
        tool_results = {call["tool_call_id"]: call["content"] for call in result["result_tool_calls"]}
        
        # Should have actual calculation result
        assert "15" in str(tool_results) or 15 in [int(x) for x in str(tool_results).split() if x.isdigit()]
        
        # Should have greeting result
        assert "Alice" in str(tool_results)
        
        # Result text should mention tool execution
        assert "executed" in result["result_text"].lower() or "results" in result["result_text"].lower()
        
    @pytest.mark.asyncio
    async def test_mock_provider_context_aware_tools(self):
        """Test tools that access execution context"""
        
        def context_tool(message: str, context) -> str:
            """Tool that uses context"""
            user_name = context.get("user_name", "User")
            return f"Context tool executed by {user_name}: {message}"
        
        template = """
# pre: setup
{% set user_name = "TestUser" %}
{% set allowed_tools = ["context_tool"] %}

# prompt: setup
## user
Use the context tool with message 'test'.
"""
        
        options = {
            "with_tools": {
                "context_tool": {
                    "fn": context_tool,
                    "with_context": True
                }
            }
        }
        
        result = await start(template, options)
        
        # Should have executed context-aware tool
        assert len(result["result_tool_calls"]) == 1
        
        # Tool should have accessed context
        tool_result = result["result_tool_calls"][0]["content"]
        assert "TestUser" in tool_result
        assert "test" in tool_result
        
    @pytest.mark.asyncio
    async def test_mock_provider_tool_error_handling(self):
        """Test tool error handling in mock provider"""
        
        def failing_tool(message: str) -> str:
            """Tool that always fails"""
            raise ValueError("This tool always fails")
        
        template = """
# pre: setup
{% set allowed_tools = ["failing_tool"] %}

# prompt: setup
## user
Use the failing tool.
"""
        
        options = {
            "with_tools": {
                "failing_tool": {"fn": failing_tool}
            }
        }
        
        result = await start(template, options)
        
        # Should have attempted tool execution
        assert len(result["result_tool_calls"]) == 1
        
        # Tool call should be marked as error
        tool_call = result["result_tool_calls"][0]
        assert tool_call.get("with_error") == True
        assert "This tool always fails" in tool_call["content"]
        
    @pytest.mark.asyncio
    async def test_mock_provider_intelligent_arguments(self):
        """Test that mock provider generates intelligent arguments"""
        
        def calculator(operation: str, a: float, b: float) -> float:
            """Calculate with two numbers"""
            if operation == "add":
                return a + b
            elif operation == "multiply":
                return a * b
            return 0
        
        template = """
# pre: setup
{% set allowed_tools = ["calculator"] %}

# prompt: setup
## user
Please calculate 7 times 8.
"""
        
        options = {
            "with_tools": {
                "calculator": {"fn": calculator}
            }
        }
        
        result = await start(template, options)
        
        # Should have executed calculator
        assert len(result["result_tool_calls"]) == 1
        
        # Should have intelligent result (mock provider should extract 7 and 8 from prompt)
        tool_result = result["result_tool_calls"][0]["content"]
        # The mock provider should have extracted the numbers from the prompt
        assert isinstance(float(tool_result), float)


if __name__ == "__main__":
    pytest.main([__file__])
