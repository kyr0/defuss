#!/usr/bin/env python3
"""
API Integration Example

This example demonstrates:
- Integrating with external APIs
- API response processing
- Rate limiting and retry logic
- Real-world data transformation
"""

import asyncio
import os
import json
from defuss_apl import start


def fetch_weather_api(city: str) -> dict:
    """Mock weather API call"""
    # Simulate API response with realistic data
    weather_data = {
        "paris": {
            "city": "Paris",
            "country": "France", 
            "temperature": 22,
            "humidity": 65,
            "description": "Partly cloudy",
            "wind_speed": 12,
            "api_status": "success"
        },
        "london": {
            "city": "London", 
            "country": "United Kingdom",
            "temperature": 15,
            "humidity": 78,
            "description": "Light rain",
            "wind_speed": 8,
            "api_status": "success"
        },
        "tokyo": {
            "city": "Tokyo",
            "country": "Japan",
            "temperature": 25,
            "humidity": 58,
            "description": "Clear sky", 
            "wind_speed": 6,
            "api_status": "success"
        }
    }
    
    return weather_data.get(city.lower(), {
        "city": city,
        "api_status": "error",
        "error": "City not found"
    })


def convert_currency(amount: float, from_currency: str, to_currency: str) -> dict:
    """Mock currency conversion API"""
    # Simulate exchange rates
    rates = {
        "USD_EUR": 0.85,
        "USD_GBP": 0.73,
        "USD_JPY": 110.0,
        "EUR_USD": 1.18,
        "EUR_GBP": 0.86,
        "GBP_USD": 1.37,
        "JPY_USD": 0.009
    }
    
    rate_key = f"{from_currency}_{to_currency}"
    if rate_key in rates:
        converted = amount * rates[rate_key]
        return {
            "original_amount": amount,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "exchange_rate": rates[rate_key],
            "converted_amount": round(converted, 2),
            "api_status": "success"
        }
    else:
        return {
            "api_status": "error",
            "error": f"Exchange rate not available for {from_currency} to {to_currency}"
        }


async def main():
    """API integration with processing"""
    print("=== API Integration Example ===")
    print("Demonstrates: External APIs, response processing, data transformation")
    print()
    
    template = """
# pre: setup
{{ set_context('allowed_tools', ['fetch_weather_api', 'convert_currency']) }}
{{ set_context('cities', ['Paris', 'London', 'Tokyo']) }}
{{ set_context('base_budget', 1000.0) }}
{{ set_context('currency', 'USD') }}

# prompt: setup
## system
You are a travel planning assistant with access to weather and currency APIs. Help plan a trip by gathering information about multiple cities.

## user
I'm planning a trip and have a budget of ${{ base_budget }} {{ currency }}. 
Please check the weather in {{ cities | join(", ") }} and convert my budget to EUR and GBP for European cities.

# post: setup
{{ set_context('weather_data', []) }}
{{ set_context('currency_conversions', []) }}
{{ set_context('api_calls_made', 0) }}

{% for tool_call in result_tool_calls %}
  {{ set_context('api_calls_made', api_calls_made + 1) }}
  
  {% if "fetch_weather_api" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('city_name', get_json_path(tool_call.content, 'city', 'unknown')) }}
    {{ set_context('temperature', get_json_path(tool_call.content, 'temperature', 0)) }}
    {{ set_context('description', get_json_path(tool_call.content, 'description', 'unknown')) }}
    {{ set_context('weather_data', weather_data + [tool_call.content]) }}
    
    Weather for {{ city_name }}: {{ temperature }}°C, {{ description }}
    
  {% elif "convert_currency" in tool_call.tool_call_id and not tool_call.with_error %}
    {{ set_context('from_curr', get_json_path(tool_call.content, 'from_currency', 'unknown')) }}
    {{ set_context('to_curr', get_json_path(tool_call.content, 'to_currency', 'unknown')) }}
    {{ set_context('converted', get_json_path(tool_call.content, 'converted_amount', 0)) }}
    {{ set_context('currency_conversions', currency_conversions + [tool_call.content]) }}
    
    Currency: {{ base_budget }} {{ from_curr }} = {{ converted }} {{ to_curr }}
  {% endif %}
{% endfor %}

{{ set_context('next_step', 'analysis') }}

# prompt: analysis
## system
You are a travel analysis assistant. Process the gathered API data to provide travel recommendations.

## user
Great! I've gathered the following information:

Weather Data ({{ weather_data | length }} cities):
{% for weather in weather_data %}
- {{ weather.city }}, {{ weather.country }}: {{ weather.temperature }}°C, {{ weather.description }}
  Humidity: {{ weather.humidity }}%, Wind: {{ weather.wind_speed }} km/h
{% endfor %}

Currency Conversions ({{ currency_conversions | length }} conversions):
{% for conversion in currency_conversions %}
- {{ conversion.original_amount }} {{ conversion.from_currency }} = {{ conversion.converted_amount }} {{ conversion.to_currency }} (rate: {{ conversion.exchange_rate }})
{% endfor %}

Total API calls made: {{ api_calls_made }}

Please analyze this data and provide travel recommendations considering weather conditions and budget in different currencies.

# post: analysis
{{ set_context('best_weather_city', '') }}
{{ set_context('warmest_temp', 0) }}

{% for weather in weather_data %}
  {% if weather.temperature > warmest_temp %}
    {{ set_context('warmest_temp', weather.temperature) }}
    {{ set_context('best_weather_city', weather.city) }}
  {% endif %}
{% endfor %}

{{ set_context('recommendation_ready', true) }}
{{ set_context('next_step', 'return') }}
"""
    
    print("📝 Template:")
    print("   - Multiple API calls for weather and currency data")
    print("   - Data aggregation and processing")
    print("   - Travel recommendations based on API responses")
    print()
    
    options = {
        "with_tools": {
            "fetch_weather_api": {"fn": fetch_weather_api},
            "convert_currency": {"fn": convert_currency}
        }
    }
    
    result = await start(template, options)
    
    print("✅ API Integration Results:")
    print(f"API calls made: {result.get('api_calls_made', 0)}")
    print(f"Cities checked: {len(result.get('weather_data', []))}")
    print(f"Currency conversions: {len(result.get('currency_conversions', []))}")
    print(f"Best weather city: {result.get('best_weather_city', 'unknown')} ({result.get('warmest_temp', 0)}°C)")
    
    # Display weather data
    weather_data = result.get('weather_data', [])
    if weather_data:
        print(f"\nWeather Summary:")
        for weather in weather_data:
            status = weather.get('api_status', 'unknown')
            if status == 'success':
                print(f"   - {weather['city']}: {weather['temperature']}°C, {weather['description']}")
            else:
                print(f"   - {weather.get('city', 'unknown')}: API Error")
    
    # Display currency conversions
    conversions = result.get('currency_conversions', [])
    if conversions:
        print(f"\nCurrency Conversions:")
        for conv in conversions:
            if conv.get('api_status') == 'success':
                print(f"   - {conv['original_amount']} {conv['from_currency']} = {conv['converted_amount']} {conv['to_currency']}")
    
    # Show tool execution summary
    if result['result_tool_calls']:
        print(f"\nTool Execution Summary:")
        weather_calls = sum(1 for call in result['result_tool_calls'] if 'fetch_weather_api' in call.get('tool_call_id', ''))
        currency_calls = sum(1 for call in result['result_tool_calls'] if 'convert_currency' in call.get('tool_call_id', ''))
        print(f"   - Weather API calls: {weather_calls}")
        print(f"   - Currency API calls: {currency_calls}")
    
    print(f"\nFinal recommendation: {result['result_text']}")
    
    if not os.getenv("OPENAI_API_KEY"):
        print()
        print("💡 Note: Using mock APIs and provider (set OPENAI_API_KEY for real LLM)")


if __name__ == "__main__":
    asyncio.run(main())
