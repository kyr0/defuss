"""
APL Providers - LLM provider implementations
"""

import os
import json
import inspect
from typing import Dict, Any, Optional


class ProviderError(Exception):
    """Raised when provider call fails"""
    pass


def get_default_provider():
    """Get default OpenAI provider with global settings from start() options"""
    try:
        import openai
        return create_openai_provider()
    except ImportError:
        # Fall back to test utils mock provider
        from .test_utils import create_mock_provider
        return create_mock_provider()  # Default provider fallback for testing without OpenAI (§6.1)


def create_openai_provider(options: Optional[Dict[str, Any]] = None):
    """
    Create OpenAI provider function with custom options
    
    Args:
        options: Optional dict with provider-specific options including:
            - api_key: OpenAI API key (defaults to OPENAI_API_KEY environment variable)
            - base_url: Base URL for API endpoint (defaults to https://api.openai.com)
            - timeout: Request timeout in seconds
            - max_retries: Maximum number of retries for API calls
            - default_headers: Custom headers to include with every request
        
    Returns:
        Provider function compatible with APL runtime
    """
    try:
        import openai
    except ImportError:
        raise ProviderError("OpenAI library not installed. Run: pip install openai")
    
    # Initialize options if not provided
    provider_options = options or {}
    
    async def openai_provider(context: Dict[str, Any]) -> Dict[str, Any]:
        """OpenAI provider implementation"""
        try:
            # Merge options with precedence: provider options > context > env vars
            effective_api_key = provider_options.get("api_key") or context.get("api_key") or os.getenv("OPENAI_API_KEY")
            effective_base_url = provider_options.get("base_url") or context.get("base_url", "https://api.openai.com")
            
            # Initialize client with options
            client_options = {
                "api_key": effective_api_key,
                "base_url": effective_base_url
            }
            
            # Add any additional client options from provider_options
            for key in ["timeout", "max_retries", "default_headers"]:
                if key in provider_options:
                    client_options[key] = provider_options[key]
                    
            # Initialize client
            client = openai.AsyncOpenAI(**client_options)
            # Extract parameters from context
            model = context.get("model", "gpt-4o")
            prompts = context.get("prompts", [])
            tools = context.get("tools", [])
            
            # Build request parameters
            params = {
                "model": model,
                "messages": prompts,
            }
            
            # Add optional parameters
            for param in ["temperature", "max_tokens", "top_p", "presence_penalty", 
                         "frequency_penalty", "seed", "logit_bias"]:
                if context.get(param) is not None:
                    params[param] = context[param]
                    
            if context.get("stop_sequences"):
                params["stop"] = context["stop_sequences"]
                
            # Add tools if available
            if tools:
                params["tools"] = tools
                
            # Handle output format
            output_mode = context.get("output_mode")
            if output_mode == "json":
                params["response_format"] = {"type": "json_object"}
            elif output_mode == "structured_output" and context.get("output_structure"):
                # For structured output, use JSON mode and validate later
                params["response_format"] = {"type": "json_object"}
                
            # Make API call
            response = await client.chat.completions.create(**params)
            
            # Convert to dict format
            result = {
                "choices": [
                    {
                        "message": {
                            "role": response.choices[0].message.role,
                            "content": response.choices[0].message.content,
                        }
                    }
                ]
            }
            
            # Add tool calls if present
            if response.choices[0].message.tool_calls:
                tool_calls = []
                for tc in response.choices[0].message.tool_calls:
                    tool_calls.append({
                        "id": tc.id,
                        "type": tc.type,
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    })
                result["choices"][0]["message"]["tool_calls"] = tool_calls
                
            # Add usage info
            if response.usage:
                result["usage"] = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
                
            return result
            
        except Exception as e:
            raise ProviderError(f"OpenAI API error: {str(e)}")
            
    return openai_provider