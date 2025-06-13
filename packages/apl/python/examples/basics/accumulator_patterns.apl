# pre: process_data
{# Initialize dataset if not exists #}
{% if get('dataset') is none %}
{{ set('dataset', [
    {"name": "Alice", "score": 85, "category": "A"},
    {"name": "Bob", "score": 92, "category": "A"}, 
    {"name": "Charlie", "score": 78, "category": "B"},
    {"name": "Diana", "score": 96, "category": "A"},
    {"name": "Eve", "score": 88, "category": "B"}
]) }}
{{ set('index', 0) }}
{% endif %}

{# Get current item #}
{% set current_item = get('dataset', [])[get('index', 0)] %}
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
{% if get('index', 0) < get('dataset', [])|length - 1 %}
{{ add('report', ', ') }}
{% endif %}

{# Next iteration #}
{{ inc('index') }}

# prompt: process_data
## user
Processing {{ name }}: Score={{ score }}, Category={{ category }}
Progress: {{ get('total_processed', 0) }}/{{ get('dataset', [])|length }}

# post: process_data
{% if get('index', 0) < get('dataset', [])|length %}
{{ set('next_step', 'process_data') }}
{% else %}
{{ set('next_step', 'analytics') }}
{% endif %}

# prompt: analytics
## user
Data Processing Complete! 📊

=== SUMMARY STATISTICS ===
Total Records: {{ get('total_processed', 0) }}
Average Score: {{ (get('score_sum', 0) / get('total_processed', 1))|round(2) }}

=== BY CATEGORY ===
Category A: {{ get('category_a_count', 0) }} people, avg {{ (get('category_a_scores', 0) / get('category_a_count', 1))|round(2) if get('category_a_count', 0) > 0 else 'N/A' }}
Category B: {{ get('category_b_count', 0) }} people, avg {{ (get('category_b_scores', 0) / get('category_b_count', 1))|round(2) if get('category_b_count', 0) > 0 else 'N/A' }}

=== HIGH PERFORMERS (≥90) ===
{{ get('high_performers', [])|join(', ') if get('high_performers', []) else 'None' }}

=== PROCESSED DATA ===
{{ get('report', '') }}
