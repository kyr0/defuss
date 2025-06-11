"""
Unit tests for APL validation functionality
"""

import pytest
from defuss_apl import check
from defuss_apl.parser import ValidationError
from tests.fixtures.templates import VALIDATION_ERROR_TEMPLATES


class TestValidationAPI:
    """Test the validation API"""
    
    def test_valid_template_check(self):
        """Test check() function with valid template"""
        template = """
# pre: test
{{ set_context('var', 'value') }}

# prompt: test
## system
You are helpful.

## user
Hello

# post: test
{{ set_context('next_step', 'return') }}
"""
        result = check(template)
        assert result is True

    def test_invalid_template_check(self):
        """Test check() function with invalid template"""
        with pytest.raises(ValidationError):
            check(VALIDATION_ERROR_TEMPLATES["reserved_identifier"])

    def test_empty_template_check(self):
        """Test check() function with empty template"""
        with pytest.raises(ValidationError):
            check("")

    def test_template_without_prompt_check(self):
        """Test check() function with template missing prompt"""
        template = """
# pre: test
{{ set_context('var', 'value') }}

# post: test
{{ set_context('next_step', 'return') }}
"""
        with pytest.raises(ValidationError) as exc_info:
            check(template)
        assert "Missing required prompt phase" in str(exc_info.value)


class TestStepIdentifierValidation:
    """Test step identifier validation rules"""
    
    def test_valid_identifiers(self):
        """Test that valid identifiers are accepted"""
        valid_identifiers = [
            "simple",
            "with_underscore", 
            "with-dash",
            "with123numbers",
            "Step 1",
            "complex identifier with spaces"
        ]
        
        for identifier in valid_identifiers:
            template = f"""
# prompt: {identifier}
Test content
"""
            result = check(template)
            assert result is True, f"Valid identifier '{identifier}' was rejected"

    def test_invalid_identifiers(self):
        """Test that invalid identifiers are rejected"""
        invalid_cases = [
            ("test:invalid", "colon"),
            ("test#invalid", "hash"),
            ("test\ninvalid", "newline"),
            ("test\rinvalid", "carriage return")
        ]
        
        for identifier, reason in invalid_cases:
            template = f"""
# prompt: {identifier}
Test content
"""
            with pytest.raises(ValidationError) as exc_info:
                check(template)
            assert "Invalid step identifier" in str(exc_info.value), f"Should reject identifier with {reason}"

    def test_reserved_identifier_validation(self):
        """Test that reserved identifier 'return' is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            check(VALIDATION_ERROR_TEMPLATES["reserved_identifier"])
        assert "Reserved step identifier: return" in str(exc_info.value)

    def test_duplicate_identifier_validation(self):
        """Test that duplicate identifiers are rejected"""
        with pytest.raises(ValidationError) as exc_info:
            check(VALIDATION_ERROR_TEMPLATES["duplicate_identifier"])
        assert "Duplicate step identifier" in str(exc_info.value)

    def test_case_sensitive_identifiers(self):
        """Test that identifiers are case-sensitive"""
        template = """
# prompt: Test
First step

# prompt: test
Second step
"""
        # Should be valid since Test != test
        result = check(template)
        assert result is True


class TestPhaseValidation:
    """Test phase validation rules"""
    
    def test_valid_phases(self):
        """Test that valid phases are accepted"""
        template = """
# pre: test
Setup

# prompt: test
## user
Test

# post: test
Cleanup
"""
        result = check(template)
        assert result is True

    def test_case_insensitive_phases(self):
        """Test that phase names are case-insensitive"""
        template = """
# PRE: test
Setup

# PROMPT: test
## user
Test

# POST: test
Cleanup
"""
        result = check(template)
        assert result is True

    def test_phase_with_spaces(self):
        """Test that phases can have surrounding spaces"""
        template = """
#  pre  : test
Setup

#   prompt   : test
## user
Test

#  post  : test
Cleanup
"""
        result = check(template)
        assert result is True

    def test_prompt_phase_required(self):
        """Test that prompt phase is required"""
        template = """
# pre: test
Setup only
"""
        with pytest.raises(ValidationError) as exc_info:
            check(template)
        assert "Missing required prompt phase" in str(exc_info.value)

    def test_invalid_phase_names(self):
        """Test that invalid phase names are rejected"""
        invalid_phases = ["invalid", "setup", "execute", "cleanup"]
        
        for phase in invalid_phases:
            template = f"""
# {phase}: test
Content

# prompt: test
## user
Required prompt
"""
            with pytest.raises(ValidationError) as exc_info:
                check(template)
            assert "Invalid phase" in str(exc_info.value) or "Unknown phase" in str(exc_info.value)


class TestRoleValidation:
    """Test role validation in prompt phases"""
    
    def test_valid_roles(self):
        """Test that valid roles are accepted"""
        template = """
# prompt: test
## system
System message

## user  
User message

## assistant
Assistant message

## developer
Developer message

## tool_result
Tool result message
"""
        result = check(template)
        assert result is True

    def test_case_insensitive_roles(self):
        """Test that roles are case-insensitive"""
        template = """
# prompt: test
## SYSTEM
System message

## USER
User message
"""
        result = check(template)
        assert result is True

    def test_role_with_trailing_colon(self):
        """Test that roles can have trailing colons"""
        template = """
# prompt: test
## system:
System message

## user:
User message
"""
        result = check(template)
        assert result is True

    def test_default_user_role(self):
        """Test that content defaults to user role"""
        template = """
# prompt: test
This should default to user role
"""
        result = check(template)
        assert result is True


class TestJinjaValidation:
    """Test Jinja expression validation"""
    
    def test_jinja_in_heading_rejected(self):
        """Test that Jinja in headings is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            check(VALIDATION_ERROR_TEMPLATES["jinja_in_heading"])
        assert "Invalid step heading" in str(exc_info.value)

    def test_valid_jinja_in_content(self):
        """Test that Jinja in content is accepted"""
        template = """
# pre: test
{{ set_context('var', 'value') }}
{% if get_context('condition', False) %}
Content
{% endif %}

# prompt: test
## user
Hello {{ get_context('var', 'default') }}
"""
        result = check(template)
        assert result is True

    def test_complex_jinja_expressions(self):
        """Test complex Jinja expressions in content"""
        template = """
# pre: test
{% for item in items %}
{{ set_context('processed_' + item, True) }}
{% endfor %}

# prompt: test
## user
{% if get_context('user_name', '') %}
Hello {{ get_context('user_name', 'stranger') }}
{% else %}
Hello stranger
{% endif %}
"""
        result = check(template)
        assert result is True
