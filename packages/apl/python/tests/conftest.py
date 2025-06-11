"""
Pytest configuration and shared fixtures for APL tests
"""

import pytest
import asyncio
from typing import Dict, Any
from defuss_apl.test_utils import create_mock_provider, create_echo_provider


@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_provider():
    """Fixture providing a mock LLM provider for testing"""
    return create_mock_provider()


@pytest.fixture
def echo_provider():
    """Fixture providing an echo provider for testing"""
    return create_echo_provider()


@pytest.fixture
def basic_options() -> Dict[str, Any]:
    """Basic options for APL execution"""
    return {
        "debug": False,
        "timeout": 5000,  # 5 seconds for tests
    }


@pytest.fixture
def tool_options(basic_options) -> Dict[str, Any]:
    """Options with tool configuration for testing"""
    def calc(x: int, y: int) -> int:
        """Add two integers and return the sum."""
        return x + y
    
    calc_tool = {
        "fn": calc,
        "with_context": False
    }
    
    options = basic_options.copy()
    options["with_tools"] = {"calc": calc_tool}
    return options
