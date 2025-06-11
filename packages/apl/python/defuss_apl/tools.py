"""
APL Tools - Handle native tool calling
"""

import inspect
import json
import asyncio
from typing import Dict, List, Any, Callable, Optional, get_type_hints


class ToolError(Exception):
    """Raised when tool execution fails"""
    pass


def describe_tools(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate tool descriptions for LLM provider (§6 Runtime API)"""
    # Get with_tools from context per spec
    with_tools = context.get("with_tools", {})
    allowed_tools = context.get("allowed_tools", [])
    
    tools = []
    
    for tool_name, tool_config in with_tools.items():
        if not allowed_tools or tool_name in allowed_tools:
            # Get descriptor
            if "descriptor" in tool_config:
                # Use provided descriptor (§5.1)
                descriptor = tool_config["descriptor"].copy()
            else:
                # Auto-generate descriptor from function (§5.1.1)
                descriptor = _generate_descriptor(tool_config["fn"])
                
            # Ensure proper OpenAI format (§5.1)
            if "type" not in descriptor:
                descriptor["type"] = "function"
                
            # If descriptor has name/description directly, wrap in function format
            if "function" not in descriptor and "name" in descriptor:
                function_def = {
                    "name": descriptor["name"],
                    "description": descriptor.get("description", ""),
                }
                if "parameters" in descriptor:
                    function_def["parameters"] = descriptor["parameters"]
                if "strict" in descriptor:
                    function_def["strict"] = descriptor["strict"]
                    
                descriptor = {
                    "type": "function",
                    "function": function_def
                }
                
            tools.append(descriptor)
            
    return tools


def _generate_descriptor(fn: Callable) -> Dict[str, Any]:
    """Auto-generate tool descriptor from function signature (§5.1.1)"""
    try:
        sig = inspect.signature(fn)
        type_hints = get_type_hints(fn)
        
        # Basic descriptor using function metadata
        descriptor = {
            "name": fn.__name__,
            "description": inspect.getdoc(fn) or f"Execute {fn.__name__}",
        }
        
        # Generate parameters schema
        properties = {}
        required = []
        
        for param_name, param in sig.parameters.items():
            # Skip 'context' parameter (§5.1.1)
            if param_name == "context":
                continue
                
            param_schema = {
                "type": "string",  # Default type
                "description": f"{param_name} parameter"
            }
            
            # Try to infer type from annotation (§5.1.1)
            if param_name in type_hints:
                hint = type_hints[param_name]
                if hint == int:
                    param_schema["type"] = "integer"
                elif hint == float:
                    param_schema["type"] = "number"
                elif hint == bool:
                    param_schema["type"] = "boolean"
                elif hint == list:
                    param_schema["type"] = "array"
                elif hint == dict:
                    param_schema["type"] = "object"
                    
            properties[param_name] = param_schema
            
            # Check if required (no default value) (§5.1.1)
            if param.default == inspect.Parameter.empty:
                required.append(param_name)
                
        if properties:
            descriptor["parameters"] = {
                "type": "object",
                "properties": properties,
                "required": required,
                "additionalProperties": False
            }
            
        return descriptor
        
    except Exception:
        # Fallback to minimal descriptor (§5.1.1)
        return {
            "name": getattr(fn, '__name__', 'unknown'),
            "description": inspect.getdoc(fn) or "Tool function"
        }


async def call_tools(tool_calls: List[Dict[str, Any]], context: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Execute multiple tool calls and return results (§6 Runtime API)"""
    results = []
    
    for tool_call in tool_calls:
        result = await call_tool(tool_call, context)
        results.append(result)
        
    return results


async def call_tool(tool_call: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a single tool call and return result (§6 Runtime API)"""
    try:
        # Get with_tools from context per spec
        with_tools = context.get("with_tools", {})
        
        tool_id = tool_call.get("id", "unknown")
        function_call = tool_call.get("function", {})
        function_name = function_call.get("name")
        
        if not function_name:
            raise ToolError("Missing function name in tool call")
            
        if function_name not in with_tools:
            raise ToolError(f"Unknown tool: {function_name}")
            
        tool_config = with_tools[function_name]
        tool_fn = tool_config["fn"]
        with_context = tool_config.get("with_context", False)
        
        # Parse arguments
        arguments_str = function_call.get("arguments", "{}")
        try:
            arguments = json.loads(arguments_str) if isinstance(arguments_str, str) else arguments_str
        except json.JSONDecodeError as e:
            raise ToolError(f"Invalid JSON arguments: {str(e)}")
            
        # Prepare function call
        if with_context:
            if asyncio.iscoroutinefunction(tool_fn):
                result = await tool_fn(**arguments, context=context)
            else:
                result = tool_fn(**arguments, context=context)
        else:
            if asyncio.iscoroutinefunction(tool_fn):
                result = await tool_fn(**arguments)
            else:
                result = tool_fn(**arguments)
                
        # Format result
        content = str(result) if result is not None else ""
        
        return {
            "role": "tool",
            "tool_call_id": tool_id,
            "content": content,
            "with_error": False
        }
        
    except Exception as e:
        error_msg = str(e)
        context["errors"].append(f"Tool call error: {error_msg}")
        
        return {
            "role": "tool", 
            "tool_call_id": tool_call.get("id", "unknown"),
            "content": error_msg,
            "with_error": True
        }


def validate_schema(result_json: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """Validate JSON result against schema (§6 Runtime API)"""
    try:
        schema = context.get("output_structure")
        if not schema:
            return True
            
        # Parse schema if it's a string
        if isinstance(schema, str):
            schema = json.loads(schema)
            
        # Try to use jsonschema if available, otherwise basic validation
        try:
            import jsonschema
            jsonschema.validate(result_json, schema)
            return True
        except ImportError:
            # Fallback to basic validation without jsonschema library
            if not _basic_schema_validation(result_json, schema):
                context["errors"].append("Schema validation failed: data does not match schema")
                return False
            return True
        except jsonschema.ValidationError as e:
            context["errors"].append(f"Schema validation failed: {str(e)}")
            return False
        except Exception as e:
            context["errors"].append(f"Schema validation error: {str(e)}")
            return False
            
    except Exception as e:
        context["errors"].append(f"Schema validation error: {str(e)}")
        return False


def _basic_schema_validation(data: Any, schema: Dict[str, Any]) -> bool:
    """Basic schema validation without jsonschema library"""
    schema_type = schema.get("type")
    
    if schema_type == "object":
        if not isinstance(data, dict):
            return False
        
        # Check required properties
        required = schema.get("required", [])
        for prop in required:
            if prop not in data:
                return False
                
        # Validate properties
        properties = schema.get("properties", {})
        for prop, prop_schema in properties.items():
            if prop in data:
                if not _basic_schema_validation(data[prop], prop_schema):
                    return False
                    
    elif schema_type == "array":
        if not isinstance(data, list):
            return False
        
        # Validate items if specified
        items = schema.get("items", {})
        if items:
            for item in data:
                if not _basic_schema_validation(item, items):
                    return False
            
    elif schema_type == "string":
        if not isinstance(data, str):
            return False
            
    elif schema_type == "integer":
        if not isinstance(data, int) or isinstance(data, bool):  # bool is subclass of int
            return False
            
    elif schema_type == "number":
        if not isinstance(data, (int, float)) or isinstance(data, bool):
            return False
            
    elif schema_type == "boolean":
        if not isinstance(data, bool):
            return False
            
    elif schema_type == "null":
        if data is not None:
            return False
            
    return True
