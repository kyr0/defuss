"""
Legacy test runner for APL Python implementation
This file imports and runs tests from the organized test modules.
For specific test categories, see:
- tests/unit/ for unit tests
- tests/integration/ for integration tests
"""

import pytest

# Import all organized test modules
from tests.unit.test_parser import *
from tests.unit.test_runtime import *
from tests.unit.test_tools import *
from tests.unit.test_helpers import *
from tests.unit.test_validation import *
from tests.unit.test_error_handling import *
from tests.integration.test_compliance import *
from tests.integration.test_workflows import *
from tests.integration.test_examples import *

# Legacy imports for backward compatibility
from defuss_apl import start, check, parse_apl, ValidationError, RuntimeError
# Additional legacy tests for backward compatibility
# These tests are maintained here for compatibility but may be
# superseded by more comprehensive tests in the organized modules

@pytest.mark.asyncio
async def test_legacy_mock_provider_tool_execution():
    """Legacy test for mock provider tool execution"""
    
    def add_numbers(a: int, b: int) -> int:
        """Add two numbers together"""
        return a + b
        
    template = """
# pre: setup
{{ set_context('allowed_tools', ['add_numbers']) }}

# prompt: setup
## user
Please add 10 and 5.
"""
    
    options = {
        "with_tools": {
            "add_numbers": {"fn": add_numbers}
        }
    }
    
    result = await start(template, options)
    
    # Should have executed tools
    assert len(result["result_tool_calls"]) >= 1


if __name__ == "__main__":
    pytest.main([__file__])
