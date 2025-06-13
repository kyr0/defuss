"""
Unit tests for APL parser functionality
"""

import pytest
from defuss_apl import parse_apl
from defuss_apl.parser import ValidationError
from tests.fixtures.templates import (
    SIMPLE_TEMPLATE,
    ROLE_CONCATENATION_TEMPLATE,
    VALIDATION_ERROR_TEMPLATES
)


class TestAPLParser:
    """Test APL parsing functionality"""
    
    def test_simple_template_parsing(self):
        """Test parsing a simple APL template"""
        steps = parse_apl(SIMPLE_TEMPLATE)
        assert "greet" in steps
        assert steps["greet"].prompt.roles["user"] == "Hello, how are you?"
        
    def test_multi_phase_template(self):
        """Test parsing template with all phases"""
        template = """
# pre: setup
{{ set('name', 'Alice') }}

# prompt: setup  
## system
You are a helpful assistant.

## user
Hello {{ name }}

# post: setup
{{ set('next_step', 'return') }}
"""
        steps = parse_apl(template)
        step = steps["setup"]
        
        assert step.pre is not None
        assert "set('name', 'Alice')" in step.pre.content
        assert step.prompt.roles["system"] == "You are a helpful assistant."
        assert step.prompt.roles["user"] == "Hello {{ name }}"
        assert step.post is not None
        assert "set('next_step', 'return')" in step.post.content

    def test_role_concatenation(self):
        """Test that duplicate roles are concatenated correctly"""
        steps = parse_apl(ROLE_CONCATENATION_TEMPLATE)
        step = steps["test"]
        
        # Check if duplicate system roles are concatenated
        system_content = step.prompt.roles.get("system", "")
        assert "First system message.\nSecond system message." in system_content
        
        # Check role_list for distinct messages
        assert hasattr(step.prompt, 'role_list')
        role_list = step.prompt.role_list
        
        # Should have 3 distinct messages: system, user, system
        assert len(role_list) == 3
        assert role_list[0] == ("system", "First system message.")
        assert role_list[1] == ("user", "User message.")
        assert role_list[2] == ("system", "Second system message.")

    def test_default_step_name(self):
        """Test that missing step name defaults to 'default'"""
        template = """
# prompt:
Hello world
"""
        steps = parse_apl(template)
        assert "default" in steps
        assert steps["default"].prompt.roles["user"] == "Hello world"

    def test_multimodal_directives_preservation(self):
        """Test that multimodal directives are preserved in content"""
        template = """
# prompt: test
## user
Here's an image:
@image_url https://example.com/image.jpg
And some text after.
"""
        steps = parse_apl(template)
        content = steps["test"].prompt.roles["user"]
        assert "@image_url https://example.com/image.jpg" in content

    def test_whitespace_handling(self):
        """Test whitespace handling in headings and content"""
        template = """
#   pre   :   test   
{{ set('var', 'value') }}

#  prompt  : test  
##   system   
You are helpful.

##  user   
Hello
"""
        steps = parse_apl(template)
        step = steps["test"]
        
        assert step.pre is not None
        assert step.prompt.roles["system"] == "You are helpful."
        assert step.prompt.roles["user"] == "Hello"


class TestValidationErrors:
    """Test validation error cases"""
    
    def test_reserved_identifier_rejection(self):
        """Test that reserved identifier 'return' is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            parse_apl(VALIDATION_ERROR_TEMPLATES["reserved_identifier"])
        assert "Reserved step identifier: return" in str(exc_info.value)
    
    def test_duplicate_identifier_rejection(self):
        """Test that duplicate step identifiers are rejected"""
        with pytest.raises(ValidationError) as exc_info:
            parse_apl(VALIDATION_ERROR_TEMPLATES["duplicate_identifier"])
        assert "Duplicate step identifier" in str(exc_info.value)
    
    def test_invalid_identifier_rejection(self):
        """Test that invalid identifiers with colons are rejected"""
        with pytest.raises(ValidationError) as exc_info:
            parse_apl(VALIDATION_ERROR_TEMPLATES["invalid_identifier"])
        assert "Invalid step identifier" in str(exc_info.value)
    
    def test_jinja_in_heading_rejection(self):
        """Test that Jinja expressions in headings are rejected"""
        with pytest.raises(ValidationError) as exc_info:
            parse_apl(VALIDATION_ERROR_TEMPLATES["jinja_in_heading"])
        assert "Invalid step heading" in str(exc_info.value)

    def test_missing_prompt_phase(self):
        """Test that templates without prompt phase are rejected"""
        template = """
# pre: test
{{ set('var', 'value') }}

# post: test
{{ set('next_step', 'return') }}
"""
        with pytest.raises(ValidationError) as exc_info:
            parse_apl(template)
        assert "missing required prompt phase" in str(exc_info.value)
