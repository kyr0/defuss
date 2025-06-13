# pre: build_strings
{# Initialize data #}
{% if get('words') is none %}
{{ set('words', ['Hello', 'beautiful', 'world']) }}
{{ set('punctuation', ['!', '?', '.']) }}
{{ set('index', 0) }}
{% endif %}

{# Build sentence #}
{% set current_word = get('words', [])[get('index', 0)] %}
{% if get('index', 0) == 0 %}
{{ add('sentence', current_word, '') }}
{% else %}
{{ add('sentence', ' ') }}
{{ add('sentence', current_word) }}
{% endif %}

{# Build word list #}
{{ add('word_list', [current_word], []) }}

{# Count characters #}
{{ add('char_count', current_word|length) }}

{# Increment index #}
{{ inc('index') }}

# prompt: build_strings
## user
Processing word: "{{ current_word }}"
Current sentence: "{{ get('sentence', '') }}"
Words collected: {{ get('word_list', []) }}
Character count: {{ get('char_count', 0) }}

# post: build_strings
{% if get('index', 0) < get('words', [])|length %}
{{ set('next_step', 'build_strings') }}
{% else %}
{{ set('next_step', 'finalize') }}
{% endif %}

# prompt: finalize
## user
String building complete!

Final Results:
- Sentence: "{{ get('sentence', '') }}"
- All words: {{ get('word_list', []) }}
- Total characters: {{ get('char_count', 0) }}
- Word count: {{ get('word_list', [])|length }}

Now adding punctuation...

# post: finalize
{# Add random punctuation #}
{% set punct = get('punctuation', [])[0] %}
{{ add('sentence', punct) }}
{{ set('next_step', 'final_result') }}

# prompt: final_result
## user
Complete sentence with punctuation: "{{ get('sentence', '') }}"

Summary:
✓ Words processed: {{ get('word_list', [])|length }}
✓ Characters counted: {{ get('char_count', 0) }}
✓ Final sentence length: {{ get('sentence', '')|length }}
