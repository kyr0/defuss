"""
Integration tests for end-to-end APL workflows
"""

import pytest
from defuss_apl import start


class TestBasicWorkflows:
    """Test basic workflow patterns"""
    
    @pytest.mark.asyncio
    async def test_simple_conversation(self, basic_options):
        """Test simple conversation workflow"""
        template = """
# pre: conversation
{{ set_context('user_name', 'Alice') }}

# prompt: conversation
## system
You are a helpful assistant talking to {{ user_name }}.

## user
Hello, can you help me?
"""
        
        context = await start(template, basic_options)
        
        assert context["user_name"] == "Alice"
        assert context["result_text"] is not None
        assert "Alice" in context["prompts"][0]["content"] or "Alice" in str(context["prompts"])

    @pytest.mark.asyncio
    async def test_data_processing_workflow(self, basic_options):
        """Test data processing workflow"""
        template = """
# pre: process_data
{{ set_context('data', [
    {"name": "John", "age": 30},
    {"name": "Jane", "age": 25},
    {"name": "Bob", "age": 35}
]) }}
{{ set_context('total_age', 0) }}
{% for person in data %}
{{ set_context('total_age', total_age + person.age) }}
{% endfor %}
{{ set_context('avg_age', total_age / (data | length)) }}

# prompt: process_data
## user
The average age is {{ avg_age }}. Analyze this data.
"""
        
        context = await start(template, basic_options)
        
        assert context["total_age"] == 90  # 30 + 25 + 35
        assert context["avg_age"] == 30.0  # 90 / 3
        assert "30" in context["result_text"]

    @pytest.mark.asyncio
    async def test_conditional_workflow(self, basic_options):
        """Test workflow with conditional logic"""
        template = """
# pre: check_conditions
{{ set_context('user_level', 'premium') }}
{{ set_context('feature_enabled', True) }}

# prompt: check_conditions
## user
Check my access

# post: check_conditions
{% if user_level == 'premium' and feature_enabled %}
{{ set_context('next_step', 'premium_features') }}
{% else %}
{{ set_context('next_step', 'basic_features') }}
{% endif %}

# prompt: premium_features
## user
Access premium features

# prompt: basic_features
## user
Access basic features
"""
        
        context = await start(template, basic_options)
        
        assert context["user_level"] == "premium"
        assert context["feature_enabled"] is True
        assert "premium features" in context["result_text"].lower()

    @pytest.mark.asyncio
    async def test_iterative_workflow(self, basic_options):
        """Test iterative workflow with counter"""
        template = """
# pre: iterate
{{ set_context('counter', 0) }}
{{ set_context('max_iterations', 3) }}

# prompt: iterate
## user
Iteration {{ counter + 1 }}

# post: iterate
{{ set_context('counter', counter + 1) }}
{% if counter < max_iterations %}
{{ set_context('next_step', 'iterate') }}
{% else %}
{{ set_context('next_step', 'complete') }}
{% endif %}

# prompt: complete
## user
Completed {{ counter }} iterations
"""
        
        context = await start(template, basic_options)
        
        assert context["counter"] == 3
        assert "Completed 3 iterations" in context["result_text"]


class TestAdvancedWorkflows:
    """Test advanced workflow patterns"""
    
    @pytest.mark.asyncio
    async def test_state_machine_workflow(self, basic_options):
        """Test state machine-like workflow"""
        template = """
# pre: init
{{ set_context('state', 'start') }}
{{ set_context('data_processed', False) }}
{{ set_context('validation_passed', False) }}

# prompt: start
## user
Initialize system

# post: start
{{ set_context('state', 'processing') }}
{{ set_context('next_step', 'process') }}

# prompt: process
## user
Process data

# post: process
{{ set_context('data_processed', True) }}
{{ set_context('state', 'validating') }}
{{ set_context('next_step', 'validate') }}

# prompt: validate
## user
Validate results

# post: validate
{{ set_context('validation_passed', True) }}
{{ set_context('state', 'complete') }}
{{ set_context('next_step', 'finish') }}

# prompt: finish
## user
System ready. State: {{ state }}
"""
        
        context = await start(template, basic_options)
        
        assert context["state"] == "complete"
        assert context["data_processed"] is True
        assert context["validation_passed"] is True
        assert "State: complete" in context["result_text"]

    @pytest.mark.asyncio
    async def test_error_handling_workflow(self, basic_options):
        """Test workflow with error handling"""
        template = """
# pre: main_operation
{{ set_context('attempt', 1) }}
{{ set_context('max_attempts', 3) }}

# prompt: main_operation
## user
Perform main operation (attempt {{ attempt }})

# post: main_operation
{% if errors and attempt < max_attempts %}
{{ set_context('attempt', attempt + 1) }}
{{ set_context('next_step', 'main_operation') }}
{% elif errors %}
{{ set_context('next_step', 'failure') }}
{% else %}
{{ set_context('next_step', 'success') }}
{% endif %}

# prompt: success
## user
Operation succeeded after {{ attempt }} attempts

# prompt: failure
## user
Operation failed after {{ max_attempts }} attempts
"""
        
        context = await start(template, basic_options)
        
        # Should succeed on first attempt (no actual errors in test)
        assert context["attempt"] >= 1
        if not context["errors"]:
            assert "succeeded" in context["result_text"].lower()

    @pytest.mark.asyncio
    async def test_pipeline_workflow(self, basic_options):
        """Test pipeline-style workflow"""
        template = """
# pre: input
{{ set_context('input_data', 'raw data') }}

# prompt: step1
## user
Step 1: Clean {{ input_data }}

# post: step1
{{ set_context('cleaned_data', 'cleaned ' + input_data) }}
{{ set_context('next_step', 'step2') }}

# prompt: step2
## user
Step 2: Transform {{ cleaned_data }}

# post: step2
{{ set_context('transformed_data', 'transformed ' + cleaned_data) }}
{{ set_context('next_step', 'step3') }}

# prompt: step3
## user
Step 3: Output {{ transformed_data }}

# post: step3
{{ set_context('final_result', 'final ' + transformed_data) }}
"""
        
        context = await start(template, basic_options)
        
        assert context["input_data"] == "raw data"
        assert context["cleaned_data"] == "cleaned raw data"
        assert context["transformed_data"] == "transformed cleaned raw data"
        assert context["final_result"] == "final transformed cleaned raw data"

    @pytest.mark.asyncio
    async def test_decision_tree_workflow(self, basic_options):
        """Test decision tree workflow"""
        template = """
# pre: decision_point
{{ set_context('user_type', 'premium') }}
{{ set_context('region', 'US') }}

# prompt: decision_point
## user
Route user request

# post: decision_point
{% if user_type == 'premium' %}
  {% if region == 'US' %}
    {{ set_context('next_step', 'premium_us') }}
  {% else %}
    {{ set_context('next_step', 'premium_intl') }}
  {% endif %}
{% else %}
  {{ set_context('next_step', 'basic') }}
{% endif %}

# prompt: premium_us
## user
Premium US service

# prompt: premium_intl
## user
Premium international service

# prompt: basic
## user
Basic service
"""
        
        context = await start(template, basic_options)
        
        assert context["user_type"] == "premium"
        assert context["region"] == "US"
        assert "Premium US service" in context["result_text"]


class TestToolIntegrationWorkflows:
    """Test workflows with tool integration"""
    
    @pytest.mark.asyncio
    async def test_calculation_workflow(self, tool_options):
        """Test workflow with calculation tools"""
        template = """
# pre: calculate
{{ set_context('allowed_tools', ['calc']) }}

# prompt: calculate
## system
You can use the calc tool to perform calculations.

## user
What's 25 + 17?

# post: calculate
{% if result_tool_calls %}
  {% for tool_call in result_tool_calls %}
    {% if not tool_call.with_error %}
      {{ set_context('calculation_result', tool_call.content) }}
    {% endif %}
  {% endfor %}
{% endif %}
{{ set_context('next_step', 'report') }}

# prompt: report
## user
The calculation result is {{ calculation_result }}
"""
        
        context = await start(template, tool_options)
        
        if context.get("calculation_result"):
            assert context["calculation_result"] == 42  # 25 + 17

    @pytest.mark.asyncio
    async def test_multi_tool_workflow(self, basic_options):
        """Test workflow with multiple tools"""
        def add(x: int, y: int) -> int:
            return x + y
        
        def multiply(x: int, y: int) -> int:
            return x * y
        
        options = basic_options.copy()
        options["with_tools"] = {
            "add": {"fn": add, "with_context": False},
            "multiply": {"fn": multiply, "with_context": False}
        }
        
        template = """
# pre: multi_calc
{{ set_context('allowed_tools', ['add', 'multiply']) }}

# prompt: multi_calc
## system
You can use add and multiply tools.

## user
Calculate (5 + 3) * 2

# post: multi_calc
{{ set_context('tool_results', []) }}
{% for tool_call in result_tool_calls %}
  {% if not tool_call.with_error %}
    {{ set_context('tool_results', tool_results + [tool_call.content]) }}
  {% endif %}
{% endfor %}
"""
        
        context = await start(template, options)
        
        # Should have used tools if provider supports it
        assert "result_tool_calls" in context


class TestDataFlowWorkflows:
    """Test data flow and transformation workflows"""
    
    @pytest.mark.asyncio
    async def test_json_processing_workflow(self, basic_options):
        """Test JSON data processing workflow"""
        template = """
# pre: json_process
{{ set_context('api_response', {
    "users": [
        {"id": 1, "name": "Alice", "status": "active"},
        {"id": 2, "name": "Bob", "status": "inactive"},
        {"id": 3, "name": "Charlie", "status": "active"}
    ],
    "total": 3
}) }}

{{ set_context('active_users', []) }}
{% for user in api_response.users %}
  {% if user.status == 'active' %}
    {{ set_context('active_users', active_users + [user.name]) }}
  {% endif %}
{% endfor %}

{{ set_context('active_count', active_users | length) }}

# prompt: json_process
## user
Found {{ active_count }} active users: {{ active_users | join(', ') }}
"""
        
        context = await start(template, basic_options)
        
        assert context["active_count"] == 2
        assert "Alice" in context["active_users"]
        assert "Charlie" in context["active_users"]
        assert "Bob" not in context["active_users"]

    @pytest.mark.asyncio
    async def test_template_composition_workflow(self, basic_options):
        """Test workflow with template composition"""
        template = """
# pre: compose
{{ set_context('base_template', 'Hello {name}') }}
{{ set_context('user_data', {'name': 'World'}) }}
{{ set_context('composed_message', base_template.format(**user_data)) }}

# prompt: compose
## user
Generated message: {{ composed_message }}

# post: compose
{{ set_context('message_length', composed_message | length) }}
{{ set_context('word_count', composed_message.split() | length) }}
"""
        
        context = await start(template, basic_options)
        
        assert context["composed_message"] == "Hello World"
        assert context["message_length"] == 11
        assert context["word_count"] == 2

    @pytest.mark.asyncio
    async def test_aggregation_workflow(self, basic_options):
        """Test data aggregation workflow"""
        template = """
# pre: aggregate
{{ set_context('sales_data', [
    {"region": "North", "amount": 1000},
    {"region": "South", "amount": 1500},
    {"region": "East", "amount": 800},
    {"region": "West", "amount": 1200},
    {"region": "North", "amount": 900}
]) }}

{{ set_context('total_sales', 0) }}
{{ set_context('region_totals', {}) }}

{% for sale in sales_data %}
  {{ set_context('total_sales', total_sales + sale.amount) }}
  {% if sale.region in region_totals %}
    {{ set_context('region_totals', region_totals | combine({sale.region: region_totals[sale.region] + sale.amount})) }}
  {% else %}
    {{ set_context('region_totals', region_totals | combine({sale.region: sale.amount})) }}
  {% endif %}
{% endfor %}

# prompt: aggregate
## user
Total sales: {{ total_sales }}. By region: {{ region_totals }}
"""
        
        context = await start(template, basic_options)
        
        assert context["total_sales"] == 5400  # Sum of all amounts
        assert context["region_totals"]["North"] == 1900  # 1000 + 900
        assert context["region_totals"]["South"] == 1500
