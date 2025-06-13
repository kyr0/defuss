# pre: process_data
{# Initialize dataset if not exists #}
{% if get_context('dataset') is none %}
{{ set_context('dataset', [
    {"name": "Alice", "score": 85, "category": "A"},
    {"name": "Bob", "score": 92, "category": "A"}, 
    {"name": "Charlie", "score": 78, "category": "B"},
    {"name": "Diana", "score": 96, "category": "A"},
    {"name": "Eve", "score": 88, "category": "B"}
]) }}
{{ set_context('index', 0) }}
{% endif %}

{# Get current item #}
{% set current_item = get_context('dataset', [])[get_context('index', 0)] %}
{% set name = current_item.name %}
{% set score = current_item.score %}
{% set category = current_item.category %}

{# Count total processed #}
{{ inc('total_processed') }}

{# Sum all scores #}
{{ add('score_sum', score) }}

{# Count by category #}
{% if category == 'A' %}
{{ inc('category_a_count') }}
{{ add('category_a_scores', score) }}
{% else %}
{{ inc('category_b_count') }}
{{ add('category_b_scores', score) }}
{% endif %}

{# Build lists #}
{{ add('all_names', [name], []) }}
{% if score >= 90 %}
{{ add('high_performers', [name], []) }}
{% endif %}

{# Build report string #}
{{ add('report', name + ' (' + category + '): ' + score|string, '') }}
{% if get_context('index', 0) < get_context('dataset', [])|length - 1 %}
{{ add('report', ', ') }}
{% endif %}

{# Next iteration #}
{{ inc('index') }}

# prompt: process_data
## user
Processing {{ name }}: Score={{ score }}, Category={{ category }}
Progress: {{ get_context('total_processed', 0) }}/{{ get_context('dataset', [])|length }}

# post: process_data
{% if get_context('index', 0) < get_context('dataset', [])|length %}
{{ set_context('next_step', 'process_data') }}
{% else %}
{{ set_context('next_step', 'analytics') }}
{% endif %}

# prompt: analytics
## user
Data Processing Complete! 📊

=== SUMMARY STATISTICS ===
Total Records: {{ get_context('total_processed', 0) }}
Average Score: {{ (get_context('score_sum', 0) / get_context('total_processed', 1))|round(2) }}

=== BY CATEGORY ===
Category A: {{ get_context('category_a_count', 0) }} people, avg {{ (get_context('category_a_scores', 0) / get_context('category_a_count', 1))|round(2) if get_context('category_a_count', 0) > 0 else 'N/A' }}
Category B: {{ get_context('category_b_count', 0) }} people, avg {{ (get_context('category_b_scores', 0) / get_context('category_b_count', 1))|round(2) if get_context('category_b_count', 0) > 0 else 'N/A' }}

=== HIGH PERFORMERS (≥90) ===
{{ get_context('high_performers', [])|join(', ') if get_context('high_performers', []) else 'None' }}

=== PROCESSED DATA ===
{{ get_context('report', '') }}
