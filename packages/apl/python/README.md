# APL Python Implementation

A minimal Python implementation of the Agentic Prompting Language (APL) according to specification v1.1.

## Features

- **Full Jinja2 Support** - Use Jinja2 templates in all phases with variable assignment and control flow
- **Multi-step Workflows** - Create complex branching workflows with `next_step` control
- **Native Tool Calling** - Execute Python functions directly from LLM tool calls
- **Provider Agnostic** - Works with OpenAI API or custom providers
- **Multimodal Support** - Handle images, audio, and files with inline attachments
- **Minimal Dependencies** - Only requires `jinja2`, optionally `openai`

## Installation

```bash
pip install defuss-apl
```

For OpenAI support:
```bash
pip install defuss-apl[openai]
```

## Quick Start

### Simple Example

```python
import asyncio
from defuss_apl import start

async def main():
    agent = """
# prompt: greet
Hello! How can I help you today?
"""
    
    result = await start(agent)
    print(result["result_text"])

asyncio.run(main())
```

### With Variables and Control Flow

```python
import asyncio
from defuss_apl import start

async def main():
    agent = """
# pre: setup
{% set user_name = "Alice" %}
{% set max_retries = 3 %}

# prompt: setup
## system
You are a helpful assistant.

## user  
Hello {{ user_name }}! Please help me with my question.

# post: setup
{% if errors and runs < max_retries %}
    {% set next_step = "setup" %}
{% else %}
    {% set next_step = "return" %}
{% endif %}
"""
    
    result = await start(agent)
    print(f"Final result: {result['result_text']}")
    print(f"Runs: {result['global_runs']}")

asyncio.run(main())
```

### With Tool Calling

```python
import asyncio
from defuss_apl import start

def calculator(operation: str, a: float, b: float) -> float:
    """Perform basic math operations"""
    if operation == "add":
        return a + b
    elif operation == "multiply":
        return a * b
    else:
        raise ValueError(f"Unknown operation: {operation}")

async def main():
    agent = """
# pre: setup
{% set allowed_tools = ["calculator"] %}

# prompt: setup
Please calculate 15 + 25 and then multiply the result by 2.
"""
    
    options = {
        "with_tools": {
            "calculator": {
                "fn": calculator,
                # Descriptor is auto-generated from function signature
            }
        }
    }
    
    result = await start(agent, options)
    print(f"Result: {result['result_text']}")
    print(f"Tool calls: {result['result_tool_calls']}")

asyncio.run(main())
```

### With Custom Provider

#### Option 1: Custom OpenAI Provider

```python
import asyncio
from defuss_apl import start, create_openai_provider

async def main():
    agent = """
# prompt: test
Test using a custom OpenAI API endpoint
"""

    # Create a custom OpenAI provider with specific options
    custom_openai = create_openai_provider(
        base_url="https://api.my-deployment.com/v1",
        options={
            "api_key": "sk-my-custom-key",
            "timeout": 60.0,
            "max_retries": 3,
            "default_headers": {"X-Organization": "my-org-id"}
        }
    )
    
    options = {
        "with_providers": {
            "gpt-4-turbo": custom_openai,
            "my-ft-model": custom_openai
        }
    }
    
    result = await start(agent, options)
    print(result["result_text"])
```

#### Option 2: Fully Custom Provider

```python
import asyncio
from defuss_apl import start, create_custom_provider

async def my_provider(context):
    """Custom LLM provider"""
    prompts = context["prompts"]
    
    # Your custom LLM logic here
    response_text = "Custom response from my LLM"
    
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
            "completion_tokens": 5,
            "total_tokens": 15
        }
    }

async def main():
    agent = """
# prompt: test
Test message for custom provider
"""
    
    options = {
        "with_providers": {
            "my-model": create_custom_provider(my_provider)
        }
    }
    
    # Override default model
    agent_with_model = """
# pre: setup
{% set model = "my-model" %}

# prompt: setup
Test message for custom provider
"""
    
    result = await start(agent_with_model, options)
    print(result["result_text"])

asyncio.run(main())
```

### Multimodal Example

```python
import asyncio
from defuss_apl import start

async def main():
    agent = """
# pre: setup
{% set model = "gpt-4o" %}
{% set temperature = 0.1 %}

# prompt: setup
## system
You are a helpful assistant that can analyze images.

## user
Please describe what you see in this image:
@image_url https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Sunrise.PNG/330px-Sunrise.PNG

And also process this document:
@file https://example.com/document.pdf
"""
    
    result = await start(agent)
    print(result["result_text"])

asyncio.run(main())
```

## API Reference

### Core Functions

#### `start(apl: str, options: Dict = None) -> Dict`

Execute an APL template and return the final context.

**Parameters:**
- `apl`: APL template string
- `options`: Optional configuration dict

**Returns:** Final execution context with all variables and results.

#### `check(apl: str) -> bool`

Validate APL template syntax. Returns `True` on success, raises `ValidationError` on failure.

#### `create_openai_provider(api_key=None, base_url=None, options=None) -> callable`

Create an OpenAI provider function with custom options.

**Parameters:**
- `api_key`: Optional API key (overrides context api_key and env var)
- `base_url`: Optional base URL (overrides context base_url)
- `options`: Optional dict with provider-specific options

**Returns:** Provider function compatible with APL runtime.

**Example:**
```python
openai_provider = create_openai_provider(
    base_url="https://api.my-custom-deployment.com",
    options={
        "api_key": "sk-my-custom-key",
        "timeout": 60.0,
        "max_retries": 2,
        "default_headers": {"X-Custom-Header": "value"}
    }
)

options = {
    "with_providers": {
        "gpt-4-turbo": openai_provider,
    }
}
```

#### `create_custom_provider(provider_fn) -> callable`

Wrap a custom provider function to ensure proper format.

**Parameters:**
- `provider_fn`: Custom provider function that takes context dict

**Returns:** Provider function compatible with APL runtime.

### Configuration Options

```python
options = {
    # Tool functions
    "with_tools": {
        "tool_name": {
            "fn": tool_function,
            "descriptor": {...},  # Optional, auto-generated if not provided
            "with_context": False  # Whether to pass context to tool
        }
    },
    
    # Custom providers
    "with_providers": {
        "model_name": provider_function
    },
    
    # Execution limits
    "max_timeout": 120000,  # milliseconds
    "max_runs": float('inf')
}
```

### Context Variables

The execution context contains:

**Executor-maintained variables:**
- `result_text`: Text output from LLM
- `result_json`: Parsed JSON output (if `output_mode` is "json")
- `result_tool_calls`: List of executed tool calls
- `result_image_urls`: List of image URLs from LLM response
- `usage`: Token usage statistics
- `runs`: Number of runs for current step
- `global_runs`: Total runs across all steps
- `errors`: List of error messages
- `time_elapsed`: Time elapsed for current step (ms)
- `time_elapsed_global`: Total time elapsed (ms)

**User-settable variables:**
- `model`: LLM model name (default: "gpt-4o")
- `temperature`: Sampling temperature
- `max_tokens`: Maximum tokens to generate
- `allowed_tools`: List of allowed tool names
- `output_mode`: "json" or "structured_output"
- `stop_sequences`: List of stop sequences

## Tool Development

### Simple Tool

```python
def my_tool(param1: str, param2: int = 42) -> str:
    """Tool description for LLM"""
    return f"Processed {param1} with {param2}"
```

### Tool with Context Access

```python
def context_tool(message: str, context) -> str:
    """Tool that accesses execution context"""
    user_name = context.get("user_name", "User")
    return f"Hello {user_name}, you said: {message}"

# Register with context access
options = {
    "with_tools": {
        "context_tool": {
            "fn": context_tool,
            "with_context": True
        }
    }
}
```

### Custom Tool Descriptor

```python
options = {
    "with_tools": {
        "my_tool": {
            "fn": my_tool_function,
            "descriptor": {
                "type": "function",
                "function": {
                    "name": "my_tool",
                    "description": "Custom tool description",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "input": {"type": "string", "description": "Input text"}
                        },
                        "required": ["input"]
                    }
                }
            }
        }
    }
}
```

## Error Handling

APL provides comprehensive error handling:

```python
try:
    result = await start(agent, options)
    
    # Check for execution errors
    if result["errors"]:
        print("Errors occurred:", result["errors"])
    
    print("Success:", result["result_text"])
    
except ValidationError as e:
    print("Template validation failed:", e)
    
except RuntimeError as e:
    print("Execution failed:", e)
```

## Development

### Running Tests

```bash
# Install dev dependencies
pip install defuss-apl[dev]

# Run tests
pytest tests/
```

### Testing Without OpenAI

The implementation includes a mock provider for testing without OpenAI API access:

```python
# Will use mock provider automatically if openai is not installed
result = await start(agent)
```

## License

MIT License - see LICENSE file for details.
