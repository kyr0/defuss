"""
APL (Agentic Prompting Language) - Python Implementation

A minimal implementation of APL according to specification v1.1
Dependencies: jinja2, openai (optional)
"""

from .runtime import start, check, RuntimeError
from .tools import describe_tools, call_tool, call_tools, validate_schema
from .providers import create_openai_provider
from .parser import parse_apl, ValidationError

__version__ = "1.1.0"
__all__ = [
    "start",
    "check", 
    "parse_apl",
    "describe_tools",
    "call_tool",
    "call_tools",
    "validate_schema",
    "create_openai_provider",
    "ValidationError",
    "RuntimeError",
]
