"""
Example tools for APL CLI
"""

def calculator(operation: str, a: float, b: float) -> float:
    """Perform basic math operations"""
    if operation == "add":
        return a + b
    elif operation == "subtract":
        return a - b
    elif operation == "multiply":
        return a * b
    elif operation == "divide":
        return a / b if b != 0 else float('inf')
    else:
        raise ValueError(f"Unknown operation: {operation}")


def get_weather(city: str) -> str:
    """Get weather information for a city (mock)"""
    return f"The weather in {city} is sunny with 22°C"


def reverse_string(text: str) -> str:
    """Reverse a string"""
    return text[::-1]


# Export tools in the expected format
TOOLS = {
    "calculator": {"fn": calculator},
    "get_weather": {"fn": get_weather}, 
    "reverse_string": {"fn": reverse_string}
}
