# pre: process_data
{% if get_context('dataset') is none %}
{{ set_context('dataset', [
    {"name": "Alice", "score": 85, "category": "A"},
    {"name": "Bob", "score": 92, "category": "A"}, 
    {"name": "Charlie", "score": 78, "category": "B"},
    {"name": "Diana", "score": 96, "category": "A"}
]) }}
{{ set_context('index', 0) }}
{% endif %}

{% set current_item = get_context('dataset', [])[get_context('index', 0)] %}
{% set score = current_item.score %}
{% set category = current_item.category %}

{# Accumulate statistics #}
{{ inc('total_processed') }}
{{ add('score_sum', score) }}
{% if category == 'A' %}
{{ inc('category_a_count') }}
{{ add('category_a_scores', score) }}
{% endif %}

{# Build processed list #}
{{ add('high_performers', [current_item.name] if score > 90 else [], []) }}

{{ inc('index') }}

# prompt: process_data
## user
Processing {{ current_item.name }}: Score={{ score }}, Category={{ category }}

# post: process_data
{% if get_context('index', 0) < get_context('dataset', [])|length %}
{{ set_context('next_step', 'process_data') }}
{% else %}
{{ set_context('next_step', 'analytics') }}
{% endif %}

# prompt: analytics
## user
Data Processing Complete!

Statistics:
- Total processed: {{ get_context('total_processed', 0) }}
- Average score: {{ (get_context('score_sum', 0) / get_context('total_processed', 1))|round(2) }}
- Category A count: {{ get_context('category_a_count', 0) }}
- Category A average: {{ (get_context('category_a_scores', 0) / get_context('category_a_count', 1))|round(2) if get_context('category_a_count', 0) > 0 else 'N/A' }}
- High performers (>90): {{ get_context('high_performers', []) }}
