# APL Python Examples

This directory contains comprehensive examples demonstrating APL (Agentic Prompting Language) features using the new `set_context` syntax.

## 📁 Directory Structure

### `/basics/` - Getting Started
- **Simple Examples** - Basic APL templates with variables and control flow
- **Tool Usage** - Introduction to tool calling and context-aware tools  
- **Error Handling** - Basic error handling patterns

### `/advanced/` - Advanced Features
- **Enhanced Features** - Function introspection, intelligent arguments, context-aware tools
- **Complex Workflows** - Multi-step workflows with branching logic
- **JSON Processing** - Working with JSON outputs and structured data

### `/integrations/` - Real-World Use Cases
- **API Integration** - Connecting APL with external APIs
- **Data Processing** - Processing and transforming data with APL
- **Multi-Modal** - Working with images, files, and mixed content

## 🚀 Quick Start

Run any example:

```bash
# Basic example
python basics/simple_greeting.py

# Tool usage
python basics/calculator_demo.py

# Advanced features  
python advanced/enhanced_features.py
```

## 📚 Key Changes from Legacy Syntax

All examples use the new `set_context` syntax instead of `{% set %}`:

**Old syntax:**
```jinja
{% set user_name = "Alice" %}
{% set next_step = "return" %}
```

**New syntax:**
```jinja
{{ set_context('user_name', 'Alice') }}
{{ set_context('next_step', 'return') }}
```

## 🔧 APL Template Files (.apl)

- `simple.apl` - Basic template example
- `with_tools.apl` - Tool calling example

## 📖 Learning Path

1. Start with `basics/simple_greeting.py` for core concepts
2. Try `basics/calculator_demo.py` for tool usage
3. Explore `advanced/enhanced_features.py` for advanced features
4. Check `integrations/` for real-world patterns

## 🎯 Features Demonstrated

- ✅ Variable assignment with `set_context`
- ✅ Tool calling and execution
- ✅ Context-aware tools
- ✅ Error handling and recovery
- ✅ Multi-step workflows
- ✅ JSON processing and extraction
- ✅ Intelligent argument generation
- ✅ Function introspection
- ✅ Multi-modal content handling
