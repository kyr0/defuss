"""
Unit tests for new accumulator helper functions
"""

import pytest
import sys
import os

# Add the parent directory to sys.path to import defuss_apl
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from defuss_apl import start


class TestAccumulatorHelpers:
    """Test accumulator helper functions"""
    
    @pytest.mark.asyncio
    async def test_inc_context_basic(self):
        """Test basic inc_context functionality"""
        template = """
# pre: test
{{ inc('counter') }}
{{ inc('counter') }}
{{ inc('counter') }}

# prompt: test
## user
Counter: {{ get_context('counter', 0) }}
"""
        
        context = await start(template, {'debug': False})
        assert context['counter'] == 3

    @pytest.mark.asyncio
    async def test_inc_context_with_default(self):
        """Test inc_context with custom default"""
        template = """
# pre: test
{{ inc('counter', 10) }}
{{ inc('counter', 10) }}

# prompt: test
## user
Counter: {{ get_context('counter', 0) }}
"""
        
        context = await start(template, {'debug': False})
        assert context['counter'] == 12  # 10 + 1 + 1

    @pytest.mark.asyncio
    async def test_add_context_numbers(self):
        """Test add_context with numbers"""
        template = """
# pre: test
{{ add('total', 5) }}
{{ add('total', 10) }}
{{ add('total', 3) }}

# prompt: test
## user
Total: {{ get_context('total', 0) }}
"""
        
        context = await start(template, {'debug': False})
        assert context['total'] == 18  # 0 + 5 + 10 + 3

    @pytest.mark.asyncio
    async def test_add_context_strings(self):
        """Test add_context with strings"""
        template = """
# pre: test
{{ add('message', 'Hello', '') }}
{{ add('message', ' ') }}
{{ add('message', 'World') }}

# prompt: test
## user
Message: {{ get_context('message', '') }}
"""
        
        context = await start(template, {'debug': False})
        assert context['message'] == 'Hello World'

    @pytest.mark.asyncio
    async def test_add_context_lists(self):
        """Test add_context with lists"""
        template = """
# pre: test
{{ add('items', [1, 2], []) }}
{{ add('items', [3, 4]) }}
{{ add('items', [5]) }}

# prompt: test
## user
Items: {{ get_context('items', []) }}
"""
        
        context = await start(template, {'debug': False})
        assert context['items'] == [1, 2, 3, 4, 5]

    @pytest.mark.asyncio
    async def test_accumulator_in_loop(self):
        """Test accumulator pattern in a loop"""
        template = """
# pre: loop
{% if get_context('data') is none %}
{{ set_context('data', [1, 2, 3, 4, 5]) }}
{{ set_context('index', 0) }}
{% endif %}
{% set current = get_context('data', [])[get_context('index', 0)] %}
{{ add('sum', current) }}
{{ inc('index') }}

# prompt: loop
## user
Added {{ current }}, sum is now {{ get_context('sum', 0) }}

# post: loop
{% if get_context('index', 0) < get_context('data', [])|length %}
{{ set_context('next_step', 'loop') }}
{% endif %}
"""
        
        context = await start(template, {'debug': False})
        assert context['sum'] == 15  # 1+2+3+4+5
        assert context['index'] == 5

    @pytest.mark.asyncio
    async def test_multiple_accumulators(self):
        """Test multiple accumulators in one workflow"""
        template = """
# pre: test
{{ add('count', 1) }}
{{ add('sum', 10) }}
{{ add('product', 2, 1) }}
{{ add('message', 'Hello', '') }}

{{ inc('count') }}
{{ add('sum', 20) }}
{{ add('product', 3) }}
{{ add('message', ' World') }}

# prompt: test
## user
Results: count={{ get_context('count', 0) }}, sum={{ get_context('sum', 0) }}, product={{ get_context('product', 1) }}, message="{{ get_context('message', '') }}"
"""
        
        context = await start(template, {'debug': False})
        assert context['count'] == 2  # 0 + 1 + 1
        assert context['sum'] == 30   # 0 + 10 + 20
        assert context['product'] == 6 # 1 * 2 * 3
        assert context['message'] == 'Hello World'
