"""
APL Parser - Parse APL templates into executable steps
"""

import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


@dataclass 
class Phase:
    """Represents a single phase (pre/prompt/post) content"""
    content: str = ""
    roles: Dict[str, str] = field(default_factory=dict)
    role_list: List[tuple] = field(default_factory=list)  # (role, content) pairs for distinct messages


@dataclass 
class Step:
    """Represents a single APL step with its phases"""
    identifier: str
    pre: Phase = field(default_factory=Phase)
    prompt: Phase = field(default_factory=Phase) 
    post: Phase = field(default_factory=Phase)


class ValidationError(Exception):
    """Raised when APL template validation fails"""
    pass


class APLParser:
    """Parser for APL templates"""
    
    # Reserved variables for future enhancements
    RESERVED_VARIABLES = {
        'next_steps', 'await_steps', 'parallel_results', 'race_winner', 'concurrent_limit',
        'step_graph', 'workflow_state', 'checkpoint', 'rollback', 'snapshot', 'resume_from',
        'tool_registry', 'tool_dependencies', 'tool_cache', 'streaming_tools', 'tool_timeout',
        'memory', 'shared_state', 'session', 'workspace', 'vector_store',
        'trace', 'metrics', 'profiler', 'debug_info', 'audit_log',
        'conditions', 'loops', 'break_points', 'event_triggers', 'webhooks',
        'model_fallbacks', 'provider_pool', 'cost_tracking', 'rate_limits', 'model_routing',
        'permissions', 'sandbox', 'input_validation', 'output_sanitization', 'security_context',
        'plugins', 'extensions', 'middleware', 'interceptors', 'transformers',
        'sub_workflows', 'workflow_imports', 'macro_steps', 'step_library', 'template_inheritance',
        'streaming_mode', 'real_time_updates', 'push_notifications', 'websocket_handlers', 'sse_streams'
    }
    
    def __init__(self):
        # Regex patterns for parsing (§1.1, §1.2)
        self.phase_pattern = re.compile(r'^#\s*(pre|prompt|post)\s*:\s*(.*?)\s*$', re.IGNORECASE)
        self.role_pattern = re.compile(r'^##\s*(system|user|assistant|developer|tool_result)\s*:?\s*$', re.IGNORECASE)
        self.jinja_var_pattern = re.compile(r'\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[|}\[]')
        self.jinja_set_pattern = re.compile(r'\{\%\s*set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=')
        # Step identifier validation pattern (§1.1)
        self.step_identifier_pattern = re.compile(r'^[^\n\r#:]+$')
        
    def parse(self, template: str) -> Dict[str, Step]:
        """Parse APL template into steps"""
        lines = template.splitlines()
        steps: Dict[str, Step] = {}
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip empty lines and comments
            if not line or line.startswith('<!--'):
                i += 1
                continue
                
            # Check for phase heading
            match = self.phase_pattern.match(lines[i])
            if match:
                phase_name = match.group(1).lower()
                step_identifier = match.group(2).strip() or "default"
                
                # Validate step identifier (§1.1)
                if not self.step_identifier_pattern.match(step_identifier):
                    raise ValidationError(f"Invalid step identifier: {step_identifier}")
                    
                # Check for reserved identifier (§1.1)
                if step_identifier == "return":
                    raise ValidationError(f"Reserved step identifier: return")
                    
                # Check for duplicate step identifier (§1.1)
                if step_identifier in steps and phase_name == "pre":
                    raise ValidationError(f"Duplicate step identifier: {step_identifier}")
                    
                # Check for Jinja expressions in heading (§1.1)
                if '{' in lines[i] and '}' in lines[i]:
                    raise ValidationError(f"Invalid step heading: {lines[i]}")
                    
                # Get or create step
                if step_identifier not in steps:
                    steps[step_identifier] = Step(identifier=step_identifier)
                    
                step = steps[step_identifier]
                i += 1
                
                # Parse phase content
                if phase_name == "prompt":
                    i = self._parse_prompt_phase(lines, i, step.prompt)
                else:
                    content_lines = []
                    while i < len(lines) and not self.phase_pattern.match(lines[i]):
                        content_lines.append(lines[i])
                        i += 1
                    
                    content = '\n'.join(content_lines).rstrip()
                    if phase_name == "pre":
                        step.pre.content = content
                    else:  # post
                        step.post.content = content
            else:
                i += 1
                
        # Validate that each step has a prompt phase (§1.1)
        for step_id, step in steps.items():
            if not step.prompt.content and not step.prompt.roles:
                raise ValidationError(f"Step '{step_id}' missing required prompt phase")
                
        return steps
    
    def _parse_prompt_phase(self, lines: List[str], start_idx: int, prompt: Phase) -> int:
        """Parse prompt phase with role subsections"""
        current_role = None
        role_lines = []
        i = start_idx
        
        def flush_role():
            if current_role and role_lines:
                content = '\n'.join(role_lines).rstrip()
                # Add to role_list for distinct messages (§1.2)
                prompt.role_list.append((current_role, content))
                # Also maintain old roles dict for backward compatibility
                if current_role in prompt.roles:
                    # Concatenate duplicate roles with newline (§1.2)
                    prompt.roles[current_role] += '\n' + content
                else:
                    prompt.roles[current_role] = content
                    
        while i < len(lines) and not self.phase_pattern.match(lines[i]):
            line = lines[i]
            
            # Check for role heading (§1.2)
            role_match = self.role_pattern.match(line)
            if role_match:
                flush_role()
                current_role = role_match.group(1).lower()
                role_lines = []
            else:
                role_lines.append(line)
            i += 1
            
        flush_role()
        
        # If no roles specified, default to user role (§1.2)
        if not prompt.role_list:
            all_content = '\n'.join(role_lines).rstrip()
            prompt.content = all_content
            prompt.roles["user"] = all_content
            prompt.role_list.append(("user", all_content))
            
        return i
    
    def check_reserved_variables(self, template: str) -> None:
        """Check for usage of reserved variables"""
        # Find all Jinja variable references
        var_refs = set()
        
        # Extract variables from {{ }} expressions
        for match in self.jinja_var_pattern.finditer(template):
            var_refs.add(match.group(1))
            
        # Extract variables from {% set %} statements  
        for match in self.jinja_set_pattern.finditer(template):
            var_refs.add(match.group(1))
            
        # Check against reserved list
        for var in var_refs:
            if var in self.RESERVED_VARIABLES:
                raise ValidationError(f"Reserved variable: {var}")


def parse_apl(template: str) -> Dict[str, Step]:
    """Parse APL template and return dictionary of steps"""
    parser = APLParser()
    parser.check_reserved_variables(template)
    return parser.parse(template)


def check(apl: str) -> bool:
    """Validate APL template syntax. Returns True on success, raises ValidationError on failure."""
    try:
        parse_apl(apl)
        return True
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError(f"Parse error: {str(e)}")
