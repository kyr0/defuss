# APL Python Examples

This directory contains comprehensive examples demonstrating APL (Agentic Prompting Language) features using the new `set_context` syntax.

## 📁 Directory Structure

### `/basics/` - Getting Started
- **Simple Examples** - Basic APL templates with variables and control flow
- **Tool Usage** - Introduction to tool calling and context-aware tools  
- **Error Handling** - Basic error handling patterns
- **🆕 Accumulator Patterns** - Helper functions for counters, sums, and data building

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
# Basic examples
python basics/simple_greeting.py
python basic_examples_with_files.py

# Tool usage
python basics/calculator_demo.py

# 🆕 NEW: Accumulator patterns
python basics/run_accumulator_examples.py

# Advanced features  
python advanced/enhanced_features.py
python enhanced_features_with_files.py

# Syntax styles comparison
python lazy_syntax_demo_with_files.py
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

## 🆕 New Accumulator Helper Functions

APL now includes helper functions for common accumulator patterns:

```jinja
{# Increment counters #}
{{ inc_context('counter') }}        {# counter++ (starts at 0) #}

{# Add to variables #}
{{ add_context('total', 10) }}      {# total += 10 (starts at 0) #}
{{ add_context('message', 'Hi', '') }}  {# message += 'Hi' (starts empty) #}

{# Safe variable access #}
{{ get_context('user_name', 'Guest') }}  {# Returns 'Guest' if not set #}
```

**Benefits:**
- ✅ No need to check if variables exist before using
- ✅ Safe initialization with sensible defaults  
- ✅ Clean, readable accumulator patterns
- ✅ Works with numbers, strings, lists, and any addable types

See `basics/run_accumulator_examples.py` for comprehensive demonstrations.

## 🔧 APL Template Files (.apl)

- `simple.apl` - Basic template example
- `simple_greeting.apl` - Basic greeting example
- `variables_example.apl` - Variables and multi-phase example
- `control_flow_example.apl` - Control flow and multiple steps example
- `tools_example.apl` - Tool calling example
- `multimodal_example.apl` - Multimodal attachments example
- `error_handling_example.apl` - Error handling example
- `basic_tool_execution.apl` - Tool execution example
- `context_aware_tools.apl` - Context-aware tools example
- `intelligent_arguments.apl` - Intelligent argument generation example
- `error_handling_tools.apl` - Error handling with tools example
- `traditional_syntax.apl` - Traditional Jinja syntax example
- `relaxed_syntax.apl` - Relaxed APL-Jinja syntax example
- `with_tools.apl` - Tool calling example

## 🗂️ Examples with External Template Files

- `basic_examples_with_files.py` - Shows how to load templates from .apl files
- `enhanced_features_with_files.py` - Enhanced features using external templates
- `lazy_syntax_demo_with_files.py` - Demonstrates the two syntax styles using external templates

## 📖 Learning Path

1. Start with `basics/simple_greeting.py` for core concepts
2. Try `basic_examples_with_files.py` to see how to load templates from files
3. Try `basics/calculator_demo.py` for tool usage
4. Explore `enhanced_features_with_files.py` for advanced features
5. Compare syntax styles with `lazy_syntax_demo_with_files.py`
6. Check `integrations/` for real-world patterns

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
