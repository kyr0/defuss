"""
APL Test Utilities - Mock providers and testing helpers
"""

import json
import inspect
from typing import Dict, Any, Optional


class MockProviderError(Exception):
    """Raised when mock provider encounters an error"""
    pass


def create_mock_provider(echo_prompt: bool = False):
    """
    Create mock provider for testing when OpenAI is not available
    
    Args:
        echo_prompt: If True, echo back the user prompt content instead of generic responses
    """
    
    async def mock_provider(context: Dict[str, Any]) -> Dict[str, Any]:
        """Mock provider implementation with tool execution"""
        from .tools import call_tools
        
        prompts = context.get("prompts", [])
        tools = context.get("tools", [])
        with_tools = context.get("with_tools", {})
        
        # Generate mock response
        if tools and context.get("allowed_tools"):
            # Create intelligent mock tool calls based on the user prompt
            user_message = None
            for prompt in prompts:
                if prompt.get("role") == "user":
                    user_message = prompt.get("content", "")
                    break
            
            tool_calls = []
            
            # Generate smart mock tool calls based on prompt content and available tools
            for tool in tools:
                tool_name = tool["function"]["name"]
                
                # Get the actual function to inspect its signature
                tool_fn = with_tools.get(tool_name, {}).get("fn")
                
                # Special handling for get_user_data - create multiple calls for multiple user IDs
                if tool_name == "get_user_data" and tool_fn:
                    import re
                    # Extract user IDs from the prompt
                    user_ids = re.findall(r'\b\d{3,}\b', user_message or "")
                    if not user_ids:
                        user_ids = ["123"]  # default
                    
                    # Create one call per user ID
                    for user_id in user_ids:
                        tool_calls.append({
                            "id": f"call_mock_{tool_name}_{len(tool_calls)}",
                            "type": "function", 
                            "function": {
                                "name": tool_name,
                                "arguments": json.dumps({"user_id": user_id})
                            }
                        })
                    continue
                
                # Standard single-call handling for other tools
                mock_args = {}
                
                if tool_fn:
                    # Use function introspection to generate appropriate arguments
                    sig = inspect.signature(tool_fn)
                    
                    for param_name, param in sig.parameters.items():
                        # Skip context parameter
                        if param_name == "context":
                            continue
                            
                        # Generate smart arguments based on parameter name and user prompt
                        if "operation" in param_name.lower():
                            mock_args[param_name] = "add"
                        elif param_name.lower() in ["a", "x", "num1", "first"]:
                            # Extract first number from prompt
                            import re
                            numbers = re.findall(r'\d+', user_message or "")
                            mock_args[param_name] = float(numbers[0]) if numbers else 10
                        elif param_name.lower() in ["b", "y", "num2", "second"]:
                            # Extract second number from prompt
                            import re
                            numbers = re.findall(r'\d+', user_message or "")
                            mock_args[param_name] = float(numbers[1]) if len(numbers) > 1 else 5
                        elif "city" in param_name.lower():
                            # Extract city name
                            cities = ["Paris", "London", "New York", "Tokyo"]
                            city = "Paris"  # default
                            for c in cities:
                                if c.lower() in (user_message or "").lower():
                                    city = c
                                    break
                            mock_args[param_name] = city
                        elif "name" in param_name.lower():
                            # Extract names
                            names = ["Alice", "Bob", "Charlie"]
                            name = "Alice"  # default
                            for n in names:
                                if n.lower() in (user_message or "").lower():
                                    name = n
                                    break
                            mock_args[param_name] = name
                        elif "text" in param_name.lower() or "message" in param_name.lower():
                            mock_args[param_name] = "test message"
                        else:
                            # Default based on parameter type annotation
                            if param.annotation == int:
                                mock_args[param_name] = 42
                            elif param.annotation == float:
                                mock_args[param_name] = 3.14
                            elif param.annotation == bool:
                                mock_args[param_name] = True
                            else:
                                mock_args[param_name] = "test"
                else:
                    # Fallback for tools without functions (shouldn't happen in our case)
                    if "calculator" in tool_name.lower() or "calc" in tool_name.lower():
                        # Extract numbers from user message for calculator
                        import re
                        numbers = re.findall(r'\d+', user_message or "")
                        if len(numbers) >= 2:
                            mock_args = {
                                "operation": "add",
                                "a": float(numbers[0]),
                                "b": float(numbers[1])
                            }
                        else:
                            mock_args = {"operation": "add", "a": 15, "b": 25}
                            
                    elif "weather" in tool_name.lower():
                        # Extract city from user message
                        cities = ["Paris", "London", "New York", "Tokyo"]
                        city = "Paris"  # default
                        for c in cities:
                            if c.lower() in (user_message or "").lower():
                                city = c
                                break
                        mock_args = {"city": city}
                        
                    elif "reverse" in tool_name.lower():
                        mock_args = {"text": "hello world"}
                        
                    else:
                        # Generic mock arguments
                        mock_args = {"input": "test data"}
                
                tool_calls.append({
                    "id": f"call_mock_{tool_name}_{len(tool_calls)}",
                    "type": "function",
                    "function": {
                        "name": tool_name,
                        "arguments": json.dumps(mock_args)
                    }
                })
            
            # Execute the tool calls if we have the actual tool functions
            if with_tools:
                try:
                    tool_results = await call_tools(tool_calls, context)
                    
                    # Generate response incorporating tool results
                    result_summaries = []
                    for result in tool_results:
                        if not result.get("with_error"):
                            result_summaries.append(f"{result['content']}")
                    
                    response_text = f"I've executed the requested tools. Results: {', '.join(result_summaries)}"
                    
                    return {
                        "choices": [
                            {
                                "message": {
                                    "role": "assistant",
                                    "content": response_text,
                                    "tool_calls": tool_calls
                                }
                            }
                        ],
                        "usage": {
                            "prompt_tokens": len(user_message or "") // 4,
                            "completion_tokens": len(response_text) // 4,
                            "total_tokens": (len(user_message or "") + len(response_text)) // 4
                        }
                    }
                except Exception as e:
                    # If tool execution fails, return error message
                    return {
                        "choices": [
                            {
                                "message": {
                                    "role": "assistant",
                                    "content": f"Tool execution failed: {str(e)}"
                                }
                            }
                        ],
                        "usage": {
                            "prompt_tokens": 10,
                            "completion_tokens": 20,
                            "total_tokens": 30
                        }
                    }
            else:
                # No tool functions available, return response saying tools would be called
                tool_names = [tool["function"]["name"] for tool in tools]
                response_text = f"I would call these tools: {', '.join(tool_names)} (but no tool functions are available)"
                
                return {
                    "choices": [
                        {
                            "message": {
                                "role": "assistant", 
                                "content": response_text,
                                "tool_calls": tool_calls
                            }
                        }
                    ],
                    "usage": {
                        "prompt_tokens": 10,
                        "completion_tokens": 20,
                        "total_tokens": 30
                    }
                }
        else:
            # Mock text response when no tools are involved
            user_content = ""
            for prompt in prompts:
                if prompt.get("role") == "user":
                    user_content = prompt.get("content", "")
                    break
            
            # If echo_prompt is True, echo back the user content
            if echo_prompt and user_content:
                response_text = user_content
            else:
                # Generate contextual response
                if "hello" in user_content.lower():
                    response_text = "Hello! I'm doing well, thank you for asking. How can I help you today?"
                elif "calculate" in user_content.lower() or "math" in user_content.lower():
                    response_text = "I'd be happy to help with calculations! Please provide me with the numbers you'd like me to work with."
                elif "weather" in user_content.lower():
                    response_text = "I can help you check the weather! Please let me know which city you're interested in."
                else:
                    response_text = "I'm a helpful AI assistant. I can help you with various tasks including calculations, weather information, and more!"
            
            return {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": response_text
                        }
                    }
                ],
                "usage": {
                    "prompt_tokens": len(user_content) // 4,
                    "completion_tokens": len(response_text) // 4,
                    "total_tokens": (len(user_content) + len(response_text)) // 4
                }
            }
            
    return mock_provider


def create_echo_provider():
    """Create a provider that echoes back the user prompt for testing"""
    return create_mock_provider(echo_prompt=True)


def create_deterministic_provider(response_text: str = "Deterministic response"):
    """Create a provider that always returns the same response"""
    
    async def deterministic_provider(context: Dict[str, Any]) -> Dict[str, Any]:
        """Provider that returns a fixed response"""
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": len(response_text) // 4,
                "total_tokens": 10 + len(response_text) // 4
            }
        }
    
    return deterministic_provider
