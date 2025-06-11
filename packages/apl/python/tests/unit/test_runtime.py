"""
Unit tests for APL runtime execution
"""

import pytest
from defuss_apl import start
from defuss_apl.runtime import RuntimeError
from tests.fixtures.templates import (
    SIMPLE_TEMPLATE,
    CONDITIONAL_TEMPLATE,
    ERROR_HANDLING_TEMPLATE
)


class TestRuntimeExecution:
    """Test APL runtime execution behavior"""
    
    @pytest.mark.asyncio
    async def test_simple_execution(self, basic_options):
        """Test basic template execution"""
        context = await start(SIMPLE_TEMPLATE, basic_options)
        
        assert context["result_text"] is not None
        assert context["runs"] >= 1
        assert context["global_runs"] >= 1
        assert context["time_elapsed"] > 0
        assert context["time_elapsed_global"] > 0

    @pytest.mark.asyncio
    async def test_variable_lifecycle(self, basic_options):
        """Test variable lifecycle across phases"""
        template = """
# pre: test
{{ set_context('test_var', 'from_pre') }}

# prompt: test
## user
Variable value: {{ get_context('test_var', 'default') }}

# post: test
{{ set_context('post_var', 'from_post') }}
"""
        context = await start(template, basic_options)
        
        assert context["test_var"] == "from_pre"
        assert context["post_var"] == "from_post"
        assert "Variable value: from_pre" in context["result_text"]

    @pytest.mark.asyncio
    async def test_step_flow_control(self, basic_options):
        """Test step flow control with next_step"""
        template = """
# pre: step1
{{ set_context('visited_step1', True) }}

# prompt: step1
## user
Step 1

# post: step1
{{ set_context('next_step', 'step3') }}

# prompt: step2
## user
Step 2 (should be skipped)

# prompt: step3
## user
Step 3

# post: step3
{{ set_context('next_step', 'return') }}
"""
        context = await start(template, basic_options)
        
        assert context["visited_step1"] is True
        assert "Step 3" in context["result_text"]
        # Should not contain step2 content since we jumped to step3

    @pytest.mark.asyncio
    async def test_conditional_execution(self, basic_options):
        """Test conditional logic in templates"""
        context = await start(CONDITIONAL_TEMPLATE, basic_options)
        
        # Should have executed conditional logic
        assert "next_step" in context
        # The next_step should be set based on result_text content
        assert context["next_step"] in ["success", "retry"]

    @pytest.mark.asyncio
    async def test_error_reset_between_steps(self, basic_options):
        """Test that errors are reset between steps"""
        template = """
# prompt: step1
## user
Step 1

# prompt: step2
## user
Step 2
"""
        context = await start(template, basic_options)
        
        # Errors should be empty after successful execution
        assert context["errors"] == []
        
        # Context history should be maintained
        assert "context_history" in context
        assert len(context["context_history"]) >= 2

    @pytest.mark.asyncio
    async def test_timeout_handling(self):
        """Test timeout handling"""
        template = """
# prompt: test
## user
Test
"""
        options = {"timeout": 1}  # Very short timeout
        
        # Should complete normally with short template
        context = await start(template, options)
        assert context["result_text"] is not None

    @pytest.mark.asyncio
    async def test_unknown_step_error(self, basic_options):
        """Test error when jumping to unknown step"""
        with pytest.raises(RuntimeError) as exc_info:
            await start(ERROR_HANDLING_TEMPLATE, basic_options)
        assert "Unknown step: nonexistent" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_executor_maintained_variables(self, basic_options):
        """Test that executor-maintained variables are set correctly"""
        context = await start(SIMPLE_TEMPLATE, basic_options)
        
        # Check required executor variables
        assert "prev_step" in context
        assert "result_text" in context
        assert "result_role" in context
        assert "runs" in context
        assert "global_runs" in context
        assert "time_elapsed" in context
        assert "time_elapsed_global" in context
        assert "errors" in context
        assert "context" in context
        assert "context_history" in context

    @pytest.mark.asyncio
    async def test_context_history_tracking(self, basic_options):
        """Test context history tracking"""
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
{{ set_context('next_step', 'return') }}
"""
        context = await start(template, basic_options)
        
        history = context["context_history"]
        assert len(history) >= 2
        
        # Each history entry should be a complete context snapshot
        for entry in history:
            assert "prev_step" in entry
            assert "result_text" in entry
            assert "runs" in entry
