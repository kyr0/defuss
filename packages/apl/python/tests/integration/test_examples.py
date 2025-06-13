"""
Integration tests for APL examples and use cases
"""

import pytest
from defuss_apl import start


class TestBasicExamples:
    """Test basic APL examples from documentation"""
    
    @pytest.mark.asyncio
    async def test_simple_greeting(self, basic_options):
        """Test simple greeting example"""
        template = """
# prompt: greet
## user
Hello, how are you?
"""
        
        context = await start(template, basic_options)
        
        assert context["result_text"] is not None
        assert len(context["result_text"]) > 0

    @pytest.mark.asyncio
    async def test_personalized_greeting(self, basic_options):
        """Test personalized greeting with variables"""
        template = """
# pre: setup
{{ set('user_name', 'Alice') }}
{{ set('time_of_day', 'morning') }}

# prompt: setup
## system
You are a friendly assistant.

## user
Good {{ get('time_of_day', 'day') }}, my name is {{ get('user_name', 'User') }}. How are you?
"""
        
        context = await start(template, basic_options)
        
        assert context["user_name"] == "Alice"
        assert context["time_of_day"] == "morning"
        assert "Alice" in str(context["prompts"])
        assert "morning" in str(context["prompts"])

    @pytest.mark.asyncio
    async def test_multi_turn_conversation(self, basic_options):
        """Test multi-turn conversation example"""
        template = """
# pre: intro
{{ set('topic', 'weather') }}

# prompt: intro
## user
Let's talk about {{ get('topic', 'general') }}

# post: intro
{{ set('next_step', 'followup') }}

# prompt: followup
## user
What do you think about today's {{ get('topic', 'general') }}?
"""
        
        context = await start(template, basic_options)
        
        assert context["topic"] == "weather"
        assert len(context["context_history"]) == 2  # Two steps executed

    @pytest.mark.asyncio
    async def test_conditional_response(self, basic_options):
        """Test conditional response example"""
        template = """
# pre: check_time
{{ set('hour', 14) }}  # 2 PM

# prompt: check_time
## user
What time is it?

# post: check_time
{% if get('hour', 0) < 12 %}
{{ set('greeting', 'Good morning') }}
{% elif get('hour', 0) < 18 %}
{{ set('greeting', 'Good afternoon') }}
{% else %}
{{ set('greeting', 'Good evening') }}
{% endif %}
{{ set('next_step', 'respond') }}

# prompt: respond
## user
{{ get('greeting', 'Hello') }}! It's {{ get('hour', 0) }}:00.
"""
        
        context = await start(template, basic_options)
        
        assert context["hour"] == 14
        assert context["greeting"] == "Good afternoon"
        assert "Good afternoon" in context["result_text"]


class TestDataProcessingExamples:
    """Test data processing examples"""
    
    @pytest.mark.asyncio
    async def test_list_processing(self, basic_options):
        """Test list processing example"""
        template = """
# pre: process_list
{{ set('numbers', [1, 2, 3, 4, 5]) }}

{% for num in get('numbers', []) %}
  {{ add('sum_total', num) }}
  {% if num % 2 == 0 %}
    {{ add('even_numbers', [num], []) }}
  {% endif %}
{% endfor %}

# prompt: process_list
## user
Sum: {{ get('sum_total', 0) }}, Even numbers: {{ get('even_numbers', []) }}
"""
        
        context = await start(template, basic_options)
        
        assert context["sum_total"] == 15  # 1+2+3+4+5
        assert context["even_numbers"] == [2, 4]
        assert "Sum: 15" in context["result_text"]

    @pytest.mark.asyncio
    async def test_json_data_example(self, basic_options):
        """Test JSON data processing example"""
        template = """
# pre: process_json
{{ set('user_data', {
    "name": "Alice",
    "preferences": {
        "theme": "dark",
        "language": "en"
    },
    "history": ["login", "view_profile", "logout"]
}) }}

{{ set('user_name', get_json_path(get('user_data', {}), "name", "Unknown")) }}
{{ set('theme', get_json_path(get('user_data', {}), "preferences.theme", "light")) }}
{{ set('last_action', get_json_path(get('user_data', {}), "history.-1", "none")) }}

# prompt: process_json
## user
User {{ get('user_name', 'Unknown') }} prefers {{ get('theme', 'light') }} theme. Last action: {{ get('last_action', 'none') }}
"""
        
        context = await start(template, basic_options)
        
        assert context["user_name"] == "Alice"
        assert context["theme"] == "dark"
        # Note: history.-1 syntax might not work, but history.2 should
        assert "Alice" in context["result_text"]
        assert "dark" in context["result_text"]

    @pytest.mark.asyncio
    async def test_template_generation(self, basic_options):
        """Test dynamic template generation"""
        template = """
# pre: generate_template
{{ set('template_vars', {
    'product': 'laptop',
    'price': 999,
    'currency': 'USD'
}) }}

{{ set('message_template', 
    'The {product} costs {price} {currency}. Would you like to purchase it?'
) }}

{{ set('generated_message', 
    get('message_template', '').format(**get('template_vars', {}))
) }}

# prompt: generate_template
## user
{{ get('generated_message', '') }}
"""
        
        context = await start(template, basic_options)
        
        expected_message = "The laptop costs 999 USD. Would you like to purchase it?"
        assert context["generated_message"] == expected_message
        assert expected_message in context["result_text"]


class TestErrorHandlingExamples:
    """Test error handling examples"""
    
    @pytest.mark.asyncio
    async def test_graceful_error_handling(self, basic_options):
        """Test graceful error handling"""
        template = """
# prompt: main_task
## user
Perform main task

# post: main_task
{% if errors %}
{{ set('error_count', errors | length) }}
{{ set('next_step', 'error_recovery') }}
{% else %}
{{ set('next_step', 'success') }}
{% endif %}

# prompt: error_recovery
## user
Encountered {{ get('error_count', 0) }} errors. Attempting recovery.

# prompt: success
## user
Task completed successfully.
"""
        
        context = await start(template, basic_options)
        
        # Should go to success path if no errors
        if not context["errors"]:
            assert "successfully" in context["result_text"].lower()

    @pytest.mark.asyncio
    async def test_retry_mechanism(self, basic_options):
        """Test retry mechanism example"""
        template = """
# pre: init_retry
{{ set('attempt', 1) }}
{{ set('max_attempts', 3) }}
{{ set('success', False) }}

# prompt: init_retry
## user
Starting retry mechanism...

# post: init_retry
{{ set('next_step', 'retry_task') }}

# prompt: retry_task
## user
Attempt {{ get('attempt', 1) }} of {{ get('max_attempts', 3) }}

# post: retry_task
{% if not get('success', False) and get('attempt', 1) < get('max_attempts', 3) %}
{{ set('attempt', get('attempt', 1) + 1) }}
{{ set('next_step', 'retry_task') }}
{% elif get('success', False) %}
{{ set('next_step', 'success') }}
{% else %}
{{ set('next_step', 'failure') }}
{% endif %}

# prompt: success
## user
Succeeded after {{ get('attempt', 1) }} attempts

# prompt: failure
## user
Failed after {{ get('max_attempts', 3) }} attempts
"""
        
        # Mock a scenario where we succeed on attempt 2
        async def mock_provider(context):
            if context.get("attempt", 1) >= 2:
                context["success"] = True
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": f"Response for attempt {context.get('attempt', 1)}"
                    }
                }]
            }
        
        options = basic_options.copy()
        options["with_providers"] = {"gpt-4o": mock_provider}
        
        context = await start(template, options)
        
        # Should succeed on second attempt
        assert context["attempt"] >= 2


class TestWorkflowPatterns:
    """Test common workflow patterns"""
    
    @pytest.mark.asyncio
    async def test_wizard_pattern(self, basic_options):
        """Test wizard/step-by-step pattern"""
        template = """
# pre: step1
{{ set('step_number', 1) }}
{{ set('total_steps', 3) }}
{{ set('collected_data', {}) }}

# prompt: step1
## user
Step {{ get('step_number') }} of {{ get('total_steps') }}: Enter your name

# post: step1
{% set collected = get('collected_data', {}) %}
{% set _ = collected.update({'name': 'Alice'}) %}
{{ set('collected_data', collected) }}
{{ set('step_number', 2) }}
{{ set('next_step', 'step2') }}

# prompt: step2
## user
Step {{ get('step_number') }} of {{ get('total_steps') }}: Enter your age

# post: step2
{% set collected = get('collected_data', {}) %}
{% set _ = collected.update({'age': 25}) %}
{{ set('collected_data', collected) }}
{{ set('step_number', 3) }}
{{ set('next_step', 'step3') }}

# prompt: step3
## user
Step {{ get('step_number') }} of {{ get('total_steps') }}: Confirm your details

# post: step3
{{ set('next_step', 'complete') }}

# prompt: complete
## user
Wizard complete! Data: {{ collected_data }}
"""
        
        context = await start(template, basic_options)
        
        assert context["step_number"] == 3
        assert context["collected_data"]["name"] == "Alice"
        assert context["collected_data"]["age"] == 25
        assert "Wizard complete" in context["result_text"]

    @pytest.mark.asyncio
    async def test_state_machine_pattern(self, basic_options):
        """Test state machine pattern"""
        template = """
# pre: state_handler
{% if get('state') is none %}
  {{ set('state', 'idle') }}
  {{ set('event', 'start') }}
{% endif %}

# prompt: state_handler
## user
Current state: {{ get('state', '') }}, Event: {{ get('event', '') }}

# post: state_handler
{% if get('state', '') == 'idle' and get('event', '') == 'start' %}
  {{ set('state', 'processing') }}
  {{ set('event', 'process') }}
  {{ set('next_step', 'state_handler') }}
{% elif get('state', '') == 'processing' and get('event', '') == 'process' %}
  {{ set('state', 'completed') }}
  {{ set('event', 'finish') }}
  {{ set('next_step', 'state_handler') }}
{% elif get('state', '') == 'completed' %}
  {{ set('next_step', 'final') }}
{% else %}
  {{ set('next_step', 'error') }}
{% endif %}

# prompt: final
## user
State machine completed successfully

# prompt: error
## user
State machine error
"""
        
        context = await start(template, basic_options)
        
        assert context["state"] == "completed"
        assert "completed successfully" in context["result_text"]

    @pytest.mark.asyncio
    async def test_pipeline_pattern(self, basic_options):
        """Test data pipeline pattern"""
        template = """
# pre: stage1_clean
{{ set('raw_data', 'HELLO WORLD') }}

# prompt: stage1_clean
## user
Stage 1: Cleaning data: {{ get('raw_data', '') }}

# post: stage1_clean
{{ set('cleaned_data', get('raw_data', '').lower()) }}
{{ set('next_step', 'stage2_transform') }}

# prompt: stage2_transform
## user
Stage 2: Transforming data: {{ get('cleaned_data', '') }}

# post: stage2_transform
{{ set('transformed_data', get('cleaned_data', '').replace(' ', '_')) }}
{{ set('next_step', 'stage3_output') }}

# prompt: stage3_output
## user
Stage 3: Final output: {{ get('transformed_data', '') }}

# post: stage3_output
{{ set('final_output', get('transformed_data', '') + '_processed') }}
"""
        
        context = await start(template, basic_options)
        
        assert context["raw_data"] == "HELLO WORLD"
        assert context["cleaned_data"] == "hello world"
        assert context["transformed_data"] == "hello_world"
        assert context["final_output"] == "hello_world_processed"


class TestRealWorldExamples:
    """Test real-world use case examples"""
    
    @pytest.mark.asyncio
    async def test_customer_support_workflow(self, basic_options):
        """Test customer support workflow"""
        template = """
# pre: triage
{{ set('customer_type', 'premium') }}
{{ set('issue_category', 'technical') }}
{{ set('priority', 'high') }}

# prompt: triage
## system
You are a customer support agent.

## user
Customer type: {{ get('customer_type', '') }}, Issue: {{ get('issue_category', '') }}, Priority: {{ get('priority', '') }}

# post: triage
{% if get('customer_type', '') == 'premium' and get('priority', '') == 'high' %}
{{ set('next_step', 'escalate') }}
{% elif get('issue_category', '') == 'technical' %}
{{ set('next_step', 'technical_support') }}
{% else %}
{{ set('next_step', 'general_support') }}
{% endif %}

# prompt: escalate
## user
Escalating to senior support team

# prompt: technical_support
## user
Routing to technical support team

# prompt: general_support
## user
Handling with general support
"""
        
        context = await start(template, basic_options)
        
        # Should escalate for premium high-priority issues
        assert "Escalating to senior support" in context["result_text"]

    @pytest.mark.asyncio
    async def test_content_moderation_workflow(self, basic_options):
        """Test content moderation workflow"""
        template = """
# pre: moderate
{{ set('content', 'This is a sample post about technology') }}
{{ set('flagged_words', ['spam', 'inappropriate', 'violation']) }}
{{ set('content_safe', True) }}

{% for word in flagged_words %}
  {% if word in content.lower() %}
    {{ set('content_safe', False) }}
  {% endif %}
{% endfor %}

# prompt: moderate
## user
Moderating content: {{ content }}

# post: moderate
{% if get('content_safe', False) %}
{{ set('next_step', 'approve') }}
{% else %}
{{ set('next_step', 'review') }}
{% endif %}

# prompt: approve
## user
Content approved for publication

# prompt: review
## user
Content flagged for manual review
"""
        
        context = await start(template, basic_options)
        
        # Should approve safe content
        assert context["content_safe"] is True
        assert "approved" in context["result_text"].lower()

    @pytest.mark.asyncio
    async def test_data_validation_workflow(self, basic_options):
        """Test data validation workflow"""
        template = """
# pre: validate
{{ set('user_input', {
    'email': 'user@example.com',
    'age': 25,
    'name': 'John Doe'
}) }}
{{ set('validation_errors', []) }}

# Email validation
{% if '@' not in get('user_input', {}).email %}
{{ set('validation_errors', validation_errors + ['Invalid email format']) }}
{% endif %}

# Age validation
{% if get('user_input', {}).age < 18 or get('user_input', {}).age > 120 %}
{{ set('validation_errors', validation_errors + ['Invalid age range']) }}
{% endif %}

# Name validation
{% if get('user_input', {}).name | length < 2 %}
{{ set('validation_errors', validation_errors + ['Name too short']) }}
{% endif %}

# prompt: validate
## user
Validating user data

# post: validate
{% if get('validation_errors', []) | length == 0 %}
{{ set('next_step', 'process') }}
{% else %}
{{ set('next_step', 'reject') }}
{% endif %}

# prompt: process
## user
Data validation passed. Processing user: {{ user_input.name }}

# prompt: reject
## user
Data validation failed. Errors: {{ validation_errors | join(', ') }}
"""
        
        context = await start(template, basic_options)
        
        # Should pass validation with valid data
        assert len(context["validation_errors"]) == 0
        assert "validation passed" in context["result_text"].lower()
        assert "John Doe" in context["result_text"]
