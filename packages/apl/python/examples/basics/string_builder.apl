# pre: build_strings
{# Initialize data #}
{% if get_context('words') is none %}
{{ set_context('words', ['Hello', 'beautiful', 'world']) }}
{{ set_context('punctuation', ['!', '?', '.']) }}
{{ set_context('index', 0) }}
{% endif %}

{# Build sentence #}
{% set current_word = get_context('words', [])[get_context('index', 0)] %}
{% if get_context('index', 0) == 0 %}
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
Current sentence: "{{ get_context('sentence', '') }}"
Words collected: {{ get_context('word_list', []) }}
Character count: {{ get_context('char_count', 0) }}

# post: build_strings
{% if get_context('index', 0) < get_context('words', [])|length %}
{{ set_context('next_step', 'build_strings') }}
{% else %}
{{ set_context('next_step', 'finalize') }}
{% endif %}

# prompt: finalize
## user
String building complete!

Final Results:
- Sentence: "{{ get_context('sentence', '') }}"
- All words: {{ get_context('word_list', []) }}
- Total characters: {{ get_context('char_count', 0) }}
- Word count: {{ get_context('word_list', [])|length }}

Now adding punctuation...

# post: finalize
{# Add random punctuation #}
{% set punct = get_context('punctuation', [])[0] %}
{{ add('sentence', punct) }}
{{ set_context('next_step', 'final_result') }}

# prompt: final_result
## user
Complete sentence with punctuation: "{{ get_context('sentence', '') }}"

Summary:
✓ Words processed: {{ get_context('word_list', [])|length }}
✓ Characters counted: {{ get_context('char_count', 0) }}
✓ Final sentence length: {{ get_context('sentence', '')|length }}
