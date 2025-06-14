# pre: initialization
{# Initialize horoscope workflow with user preferences #}
set('model', 'gpt-4o')
set('temperature', 0.8)
set('max_tokens', 800)
set('allowed_tools', ['get_current_date', 'fetch_astronomy_data', 'validate_zodiac'])

{# User configuration - normally would come from input #}
set('user_name', 'Alex')
set('birth_date', '1995-07-15')
set('zodiac_sign', 'Cancer')
set('horoscope_type', 'daily')
set('include_lucky_numbers', true)
set('include_compatibility', true)

# prompt: initialization
## system
You are Celestia, a wise and insightful astrologer with deep knowledge of zodiac signs, planetary movements, and their influence on human life. You provide personalized, thoughtful horoscope readings that are both mystical and practical.

Your personality:
- Warm and empathetic
- Uses mystical but accessible language
- Provides actionable guidance
- Balances optimism with realism
- References celestial movements and planetary influences

## user
Hello Celestia! I'm {{ get('user_name') }}, born on {{ get('birth_date') }}. I'm a {{ get('zodiac_sign') }} and I'd love a {{ get('horoscope_type') }} horoscope reading. 

{% if get('include_lucky_numbers') %}
Please include lucky numbers for today.
{% endif %}

{% if get('include_compatibility') %}
Also, could you tell me about compatibility with other signs today?
{% endif %}

# post: initialization
{# Validate the initial response and decide next step #}
if get('errors')
    next('error_recovery')
elif "cancer" not in result('text').lower() and get('zodiac_sign').lower() == 'cancer'
    {# Astrologer didn't acknowledge the zodiac sign properly #}
    next('clarify_zodiac')
elif get('horoscope_type') == 'daily'
    next('fetch_daily_data')
elif get('horoscope_type') == 'weekly'
    next('fetch_weekly_data')
else
    next('general_reading')
endif


{# --- #}


# pre: fetch_daily_data
{# Prepare to gather current astronomical data for accurate daily reading #}
set('allowed_tools', ['get_current_date', 'fetch_astronomy_data'])
set('output_mode', 'json')
set('output_structure', """{
  "type": "object",
  "properties": {
    "current_date": {"type": "string"},
    "moon_phase": {"type": "string"},
    "planetary_aspects": {"type": "array", "items": {"type": "string"}},
    "favorable_hours": {"type": "array", "items": {"type": "string"}},
    "energy_level": {"type": "string", "enum": ["low", "moderate", "high", "peak"]},
    "primary_focus": {"type": "string"},
    "warning_areas": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["current_date", "moon_phase", "energy_level", "primary_focus"]
}""")

# prompt: fetch_daily_data
## system
You have access to astronomical data tools. Use them to gather current celestial information for {{ get('user_name') }}'s {{ get('zodiac_sign') }} horoscope. Then provide a structured analysis of today's cosmic influences.

## user
Please gather today's astronomical data and analyze the cosmic influences for a {{ get('zodiac_sign') }} born on {{ get('birth_date') }}. I need structured data about today's energy and focus areas.

# post: fetch_daily_data
{# Process the structured astronomical data and plan detailed reading #}
if get('errors')
    next('error_recovery')
elif result_json and get_json_path(result_json, 'current_date')
    {# Successfully got structured data, store it for the reading #}
    set('cosmic_data', result_json)
    set('energy_level', get_json_path(result_json, 'energy_level', 'moderate'))
    set('primary_focus', get_json_path(result_json, 'primary_focus', 'general'))
    next('generate_detailed_reading')
else
    {# Fallback if structured data failed #}
    next('general_reading')
endif


{# --- #}


# pre: generate_detailed_reading
{# Prepare for the main horoscope generation with all gathered data #}
set('temperature', 0.9)  {# Higher creativity for the reading #}
set('max_tokens', 1200)
set('allowed_tools', [])  {# No tools needed for creative writing #}

if get('energy_level') == 'peak'
    set('tone', 'highly energetic and optimistic')
elif get('energy_level') == 'high'
    set('tone', 'positive and encouraging')
elif get('energy_level') == 'low'
    set('tone', 'gentle and supportive')
else
    set('tone', 'balanced and thoughtful')
endif

# prompt: generate_detailed_reading
## system
Create a comprehensive {{ get('horoscope_type') }} horoscope for {{ get('user_name') }}, a {{ get('zodiac_sign') }} born on {{ get('birth_date') }}. 

Use this cosmic data: {{ get('cosmic_data', {}) }}

Tone: {{ get('tone') }}
Primary focus area: {{ get('primary_focus', 'general well-being') }}

Structure your reading with:
1. **Cosmic Overview** - Current planetary influences
2. **Love & Relationships** - Romantic and social connections  
3. **Career & Finance** - Professional and monetary guidance
4. **Health & Wellness** - Physical and mental well-being
5. **Personal Growth** - Spiritual and emotional development

{% if get('include_lucky_numbers') %}
6. **Lucky Numbers** - 3-5 numbers for today
{% endif %}

{% if get('include_compatibility') %}
7. **Compatibility Spotlight** - Best zodiac matches for today
{% endif %}

Make it personal, mystical, and actionable. Use {{ get('user_name') }}'s name throughout.

## user
Please provide my complete {{ get('horoscope_type') }} horoscope reading based on the cosmic data you've gathered.

# post: generate_detailed_reading
{# Evaluate the quality of the horoscope and decide if enhancement is needed #}
{# Local variables for current step analysis #}
set word_count = result('text').split()|length
set has_all_sections = result('text').count('**') >= 8  {# At least 4 main sections #}
set mentions_user = get('user_name').lower() in result('text').lower()
set has_lucky = 'lucky' in result('text').lower()

if get('errors')
    next('error_recovery')
elif word_count < 200
    {# Reading too short, need enhancement #}
    set('enhancement_reason', 'too_brief')
    next('enhance_reading')
elif not has_all_sections
    {# Missing sections, need completion #}
    set('enhancement_reason', 'missing_sections')
    next('enhance_reading')
elif not mentions_user
    {# Not personalized enough #}
    set('enhancement_reason', 'needs_personalization')
    next('enhance_reading')
elif get('include_lucky_numbers') and not has_lucky
    {# Missing requested lucky numbers #}
    set('enhancement_reason', 'missing_lucky_numbers')
    next('enhance_reading')
else
    {# Reading looks complete, add finishing touches #}
    next('finalize_reading')
endif


{# --- #}


# pre: enhance_reading
{# Prepare enhancement based on what was missing #}
set('temperature', 0.7)  {# Slightly more focused for enhancement #}

{# Local variable for getting the enhancement reason #}
set reason = get('enhancement_reason')
if reason == 'too_brief'
    set('enhancement_instruction', 'expand significantly with more detail and depth')
elif reason == 'missing_sections'
    set('enhancement_instruction', 'add the missing sections with proper structure')
elif reason == 'needs_personalization'
    set('enhancement_instruction', 'make it much more personal using the name frequently')
elif reason == 'missing_lucky_numbers'
    set('enhancement_instruction', 'add the requested lucky numbers section')
else
    set('enhancement_instruction', 'improve overall quality and completeness')
endif

# prompt: enhance_reading
## system
The previous horoscope reading needs enhancement. Issue detected: {{ get('enhancement_reason') }}

Previous reading:
---
{{ result('text') }}
---

## user
Please {{ get('enhancement_instruction') }} for my horoscope reading. Keep the mystical tone and make sure it's comprehensive and personal.

# post: enhance_reading
{# Check if enhancement was successful, with retry limit #}
inc('enhancement_attempts')

if get('errors')
    next('error_recovery')
elif get('enhancement_attempts', 0) >= 2
    {# Don't enhance indefinitely #}
    next('finalize_reading')
else
    {# Check if enhancement resolved the issue - use local variables for analysis #}
    set word_count = result('text').split()|length
    set has_lucky = 'lucky' in result('text').lower()
    set enhancement_reason = get('enhancement_reason')
    
    if enhancement_reason == 'too_brief' and word_count > 400
        next('finalize_reading')
    elif enhancement_reason == 'missing_lucky_numbers' and has_lucky
        next('finalize_reading')
    elif get('user_name').lower() in result('text').lower()
        next('finalize_reading')
    else
        {# Need another enhancement attempt #}
        next('enhance_reading')
    endif
endif


{# --- #}

# pre: finalize_reading
{# Prepare final personalized message and summary #}
set('temperature', 0.6)
set('max_tokens', 300)

{# Calculate reading quality score using local variables for computation #}
set word_count = result('text').split()|length
set quality_score = 0

if word_count > 400
    set quality_score = quality_score + 1
endif

if get('user_name').lower() in result('text').lower()
    set quality_score = quality_score + 1
endif

if 'lucky' in result('text').lower() and get('include_lucky_numbers')
    set quality_score = quality_score + 1
endif

if result('text').count('**') >= 8
    set quality_score = quality_score + 1
endif

{# Store the calculated quality score in context for persistence #}
set('reading_quality', quality_score)

# prompt: finalize_reading
## system
Provide a warm, personal closing message for {{ get('user_name') }}'s horoscope reading. Include:
- A brief mystical blessing or affirmation
- Encouragement to embrace the day's energy
- A reminder about their {{ get('zodiac_sign') }} strengths
- Your signature as Celestia

Previous horoscope reading:
{{ result('text') }}

## user
Please provide a beautiful closing message for my horoscope reading that ties everything together.

# post: finalize_reading
{# Store the complete reading and provide summary statistics #}
set('final_reading', result('text'))
{# Local variable for word count calculation #}
set total_word_count = result('text').split()|length
set('total_words', total_word_count)
set('reading_complete', true)

{# Log completion statistics #}
add('completed_readings', 1, 0)
set('completion_time', time_elapsed_global)

return()


{# --- #}


# pre: clarify_zodiac
{# Handle case where astrologer didn't properly acknowledge zodiac sign #}
set('temperature', 0.6)

# prompt: clarify_zodiac
## system
You need to acknowledge and focus specifically on the {{ get('zodiac_sign') }} zodiac sign for {{ get('user_name') }}. You seem to have missed this important detail in your previous response.

## user
I want to make sure you understand - I'm a {{ get('zodiac_sign') }}, born on {{ get('birth_date') }}. Please acknowledge this and continue with my horoscope reading focusing specifically on {{ get('zodiac_sign') }} traits and influences.

# post: clarify_zodiac
if get('errors')
    next('error_recovery')
elif get('zodiac_sign').lower() in result('text').lower()
    {# Now properly acknowledged the zodiac sign #}
    next('fetch_daily_data')
else
    {# Still not acknowledging correctly, try general reading #}
    next('general_reading')
endif


{# --- #}


# pre: general_reading
{# Fallback reading without structured data #}
set('temperature', 0.8)
set('max_tokens', 1000)

# prompt: general_reading
## system
Provide a general but personalized {{ get('horoscope_type') }} horoscope for {{ get('user_name') }}, a {{ get('zodiac_sign') }} born on {{ get('birth_date') }}, without relying on specific astronomical data.

## user
Please give me a {{ get('horoscope_type') }} horoscope reading for my sign {{ get('zodiac_sign') }}.

# post: general_reading
if get('errors')
    next('error_recovery')
else
    next('finalize_reading')
endif


{# --- #}


# pre: error_recovery
{# Handle errors gracefully with a helpful message #}
inc('error_count')
set('temperature', 0.5)  {# More conservative for error handling #}

# prompt: error_recovery
## system
There have been some technical difficulties with the horoscope generation. Provide a brief, encouraging message to {{ get('user_name') }} ({{ get('zodiac_sign') }}) and offer a simple but meaningful horoscope insight.

Errors encountered: {{ get('errors')|join(', ') }}

## user
I'm experiencing some issues with my horoscope reading. Could you please provide a brief but meaningful insight for a {{ get('zodiac_sign') }}?

# post: error_recovery
{# Always complete after error recovery, don't loop #}
set('error_recovery_used', true)
return()