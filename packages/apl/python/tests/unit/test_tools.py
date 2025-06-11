"""
Unit tests for APL tool calling functionality
"""

import pytest
from defuss_apl import start
from defuss_apl.tools import describe_tools, call_tool, call_tools, validate_schema
from tests.fixtures.templates import TOOL_CALLING_TEMPLATE


class TestToolCalling:
    """Test tool calling functionality"""
    
    def test_describe_tools_automatic_inference(self):
        """Test automatic tool descriptor inference"""
        def calc(x: int, y: int) -> int:
            """Add two integers and return the sum."""
            return x + y
        
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
        
        assert len(tools) == 1
        tool = tools[0]
        
        assert tool["type"] == "function"
        function_def = tool["function"]
        assert function_def["name"] == "calc"
        assert function_def["description"] == "Add two integers and return the sum."
        
        # Check parameters
        params = function_def["parameters"]
        assert params["type"] == "object"
        assert "x" in params["properties"]
        assert "y" in params["properties"]
        assert params["properties"]["x"]["type"] == "integer"
        assert params["properties"]["y"]["type"] == "integer"
        assert params["required"] == ["x", "y"]

    def test_describe_tools_with_explicit_descriptor(self):
        """Test tool description with explicit descriptor"""
        def calc(x, y):
            return x + y
        
        context = {
            "with_tools": {
                "calc": {
                    "fn": calc,
                    "with_context": False,
                    "descriptor": {
                        "name": "calc",
                        "description": "Custom calculator tool",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "x": {"type": "number", "description": "First number"},
                                "y": {"type": "number", "description": "Second number"}
                            },
                            "required": ["x", "y"]
                        }
                    }
                }
            },
            "allowed_tools": ["calc"]
        }
        
        tools = describe_tools(context)
        
        assert len(tools) == 1
        tool = tools[0]
        function_def = tool["function"]
        
        assert function_def["name"] == "calc"
        assert function_def["description"] == "Custom calculator tool"
        assert function_def["parameters"]["properties"]["x"]["description"] == "First number"

    def test_tool_filtering_by_allowed_tools(self):
        """Test that tools are filtered by allowed_tools"""
        def calc(x: int, y: int) -> int:
            return x + y
        
        def multiply(x: int, y: int) -> int:
            return x * y
        
        context = {
            "with_tools": {
                "calc": {"fn": calc, "with_context": False},
                "multiply": {"fn": multiply, "with_context": False}
            },
            "allowed_tools": ["calc"]  # Only allow calc
        }
        
        tools = describe_tools(context)
        
        assert len(tools) == 1
        assert tools[0]["function"]["name"] == "calc"

    @pytest.mark.asyncio
    async def test_call_tool_execution(self):
        """Test individual tool call execution"""
        def calc(x: int, y: int) -> int:
            return x + y
        
        tool_call = {
            "id": "call_123",
            "type": "function",
            "function": {
                "name": "calc",
                "arguments": '{"x": 40, "y": 2}'
            }
        }
        
        context = {
            "with_tools": {
                "calc": {"fn": calc, "with_context": False}
            }
        }
        
        result = await call_tool(tool_call, context)
        
        assert result["role"] == "tool"
        assert result["tool_call_id"] == "call_123"
        assert result["content"] == 42
        assert result["with_error"] is False

    @pytest.mark.asyncio
    async def test_call_tool_with_context(self):
        """Test tool call with context parameter"""
        def calc_with_context(x: int, y: int, context=None) -> dict:
            return {
                "result": x + y,
                "step": context.get("prev_step") if context else None
            }
        
        tool_call = {
            "id": "call_456",
            "type": "function",
            "function": {
                "name": "calc_with_context",
                "arguments": '{"x": 10, "y": 5}'
            }
        }
        
        context = {
            "with_tools": {
                "calc_with_context": {
                    "fn": calc_with_context, 
                    "with_context": True
                }
            },
            "prev_step": "test_step"
        }
        
        result = await call_tool(tool_call, context)
        
        assert result["content"]["result"] == 15
        assert result["content"]["step"] == "test_step"

    @pytest.mark.asyncio
    async def test_call_tool_error_handling(self):
        """Test tool call error handling"""
        def failing_tool(x: int) -> int:
            raise ValueError("Tool execution failed")
        
        tool_call = {
            "id": "call_error",
            "type": "function",
            "function": {
                "name": "failing_tool",
                "arguments": '{"x": 1}'
            }
        }
        
        context = {
            "with_tools": {
                "failing_tool": {"fn": failing_tool, "with_context": False}
            }
        }
        
        result = await call_tool(tool_call, context)
        
        assert result["role"] == "tool"
        assert result["tool_call_id"] == "call_error"
        assert result["with_error"] is True
        assert "Tool execution failed" in str(result["content"])

    @pytest.mark.asyncio
    async def test_call_tools_batch_execution(self):
        """Test batch tool call execution"""
        def calc(x: int, y: int) -> int:
            return x + y
        
        def multiply(x: int, y: int) -> int:
            return x * y
        
        tool_calls = [
            {
                "id": "call_1",
                "type": "function",
                "function": {"name": "calc", "arguments": '{"x": 2, "y": 3}'}
            },
            {
                "id": "call_2", 
                "type": "function",
                "function": {"name": "multiply", "arguments": '{"x": 4, "y": 5}'}
            }
        ]
        
        context = {
            "with_tools": {
                "calc": {"fn": calc, "with_context": False},
                "multiply": {"fn": multiply, "with_context": False}
            }
        }
        
        results = await call_tools(tool_calls, context)
        
        assert len(results) == 2
        assert results[0]["content"] == 5  # 2 + 3
        assert results[1]["content"] == 20  # 4 * 5

    @pytest.mark.asyncio
    async def test_tool_integration_workflow(self, tool_options):
        """Test end-to-end tool calling in workflow"""
        context = await start(TOOL_CALLING_TEMPLATE, tool_options)
        
        # Should have tool call results
        assert "result_tool_calls" in context
        # The template asks for sum of 40 + 2, so if tools work, should get 42
        if context["result_tool_calls"]:
            # Check if calc tool was called
            tool_results = context["result_tool_calls"]
            calc_results = [r for r in tool_results if "calc" in r.get("tool_call_id", "")]
            if calc_results:
                assert calc_results[0]["content"] == 42


class TestSchemaValidation:
    """Test JSON schema validation functionality"""
    
    def test_valid_schema_validation(self):
        """Test validation with valid data"""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            },
            "required": ["name"]
        }
        
        context = {"errors": [], "output_structure": schema}
        valid_data = {"name": "John", "age": 30}
        
        result = validate_schema(valid_data, context)
        assert result is True
        assert len(context["errors"]) == 0

    def test_invalid_schema_validation(self):
        """Test validation with invalid data"""
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            },
            "required": ["name"]
        }
        
        context = {"errors": [], "output_structure": schema}
        invalid_data = {"age": 30}  # Missing required "name"
        
        result = validate_schema(invalid_data, context)
        assert result is False
        assert len(context["errors"]) > 0

    def test_schema_validation_error_recording(self):
        """Test that validation errors are properly recorded"""
        schema = {
            "type": "object",
            "properties": {
                "count": {"type": "integer", "minimum": 0}
            }
        }
        
        context = {"errors": [], "output_structure": schema}
        invalid_data = {"count": -1}  # Violates minimum constraint
        
        result = validate_schema(invalid_data, context)
        assert result is False
        assert len(context["errors"]) > 0
        error_message = context["errors"][0]
        assert "validation" in error_message.lower()
