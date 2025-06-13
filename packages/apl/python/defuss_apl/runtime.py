"""
APL Runtime - Execute APL templates with minimal dependencies
"""

import asyncio
import copy
import time
import re
import json
import sys
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import asdict
import copy

from jinja2 import Environment, BaseLoader, StrictUndefined

from .parser import parse_apl, ValidationError
from .tools import describe_tools, call_tools, validate_schema
from .providers import get_default_provider


def get_json_path(data: Any, path: str, default: Any = None) -> Any:
    """Extract data from JSON using dot notation path (§7.4 helper function)"""
    try:
        if data is None:
            return default
            
        # Handle simple key access
        if '.' not in path:
            if isinstance(data, dict):
                return data.get(path, default)
            elif isinstance(data, list) and path.isdigit():
                idx = int(path)
                return data[idx] if 0 <= idx < len(data) else default
            else:
                return default
        
        # Handle nested path
        keys = path.split('.')
        current = data
        
        for key in keys:
            if current is None:
                return default
            elif isinstance(current, dict):
                current = current.get(key)
            elif isinstance(current, list) and key.isdigit():
                idx = int(key)
                current = current[idx] if 0 <= idx < len(current) else None
            else:
                return default
                
        return current if current is not None else default
        
    except (KeyError, IndexError, ValueError, TypeError):
        return default

def set_json_path(data: Any, path: str, value: Any) -> bool:
    """Helper function to set a value at a specific JSON path
    
    Returns True if successful, False if path cannot be navigated
    """
    try:
        # Handle simple key access
        if '.' not in path:
            if isinstance(data, dict):
                data[path] = value
                return True
            elif isinstance(data, list) and path.isdigit():
                idx = int(path)
                if 0 <= idx < len(data):
                    data[idx] = value
                    return True
                else:
                    return False  # Index out of range
            else:
                return False  # Can't set property on non-dict/non-list
        
        # Handle nested path
        keys = path.split('.')
        current = data
        
        # Navigate to the parent of the target property
        for i, key in enumerate(keys[:-1]):
            if current is None:
                return False
            
            if isinstance(current, dict):
                # Create intermediate objects if they don't exist
                if key not in current or current[key] is None:
                    # Determine if next key is a number (for array) or string (for object)
                    next_key = keys[i + 1]
                    if next_key.isdigit():
                        current[key] = []  # Next level should be an array
                    else:
                        current[key] = {}  # Next level should be an object
                current = current[key]
            elif isinstance(current, list) and key.isdigit():
                idx = int(key)
                # Extend the list if index is out of range
                while idx >= len(current):
                    current.append(None)
                # Create intermediate objects if they don't exist
                if current[idx] is None:
                    # Determine if next key is a number (for array) or string (for object)
                    next_key = keys[i + 1]
                    if next_key.isdigit():
                        current[idx] = []  # Next level should be an array
                    else:
                        current[idx] = {}  # Next level should be an object
                current = current[idx]
            else:
                return False  # Can't navigate path
        
        # Set the value on the final object
        last_key = keys[-1]
        if isinstance(current, dict):
            current[last_key] = value
            return True
        elif isinstance(current, list) and last_key.isdigit():
            idx = int(last_key)
            # Extend the list if index is out of range
            while idx >= len(current):
                current.append(None)
            current[idx] = value
            return True
        else:
            return False  # Can't set property on non-dict/non-list
            
    except (KeyError, IndexError, ValueError, TypeError):
        return False

def set_context(var_name: str, value: Any) -> str:
    """Set a context variable (§7.4 helper function)"""
    runtime = APLRuntime._current_instance
    if runtime and runtime.current_context is not None:
        runtime.current_context[var_name] = value
        if runtime.debug:
            print(f"[APL DEBUG] set_context: {var_name} = {value} (type: {type(value)})", file=sys.stderr)
        return ""  # Return empty string to avoid output in templates
    else:
        if runtime and runtime.debug:
            print(f"[APL DEBUG] set_context called but no active context: {var_name} = {value}", file=sys.stderr)
        return ""


def get(var_name_or_path: str, default: Any = None) -> Any:
    """Get a variable from context or navigate a JSON path (§7.4 helper function)
    
    If var_name_or_path contains a dot ('.'), it will be treated as a JSON path:
    - The part before the first dot is the variable name to look up in the context
    - The remaining path is used to navigate the variable's value as a JSON structure
    
    Otherwise, it's treated as a simple context variable lookup.
    """
    runtime = APLRuntime._current_instance
    if not runtime or runtime.current_context is None:
        if runtime and runtime.debug:
            print(f"[APL DEBUG] get called but no active context: {var_name_or_path}", file=sys.stderr)
        return default
    
    # Check if this is a JSON path (contains dot notation)
    if '.' in var_name_or_path:
        # Get the base variable name (part before first dot)
        var_name = var_name_or_path.split('.', 1)[0]
        
        # Get the data from context
        data = runtime.current_context.get(var_name)
        
        # Use get_json_path to navigate the rest of the path
        result = get_json_path(data, var_name_or_path[len(var_name)+1:], default)
        
        if runtime.debug:
            print(f"[APL DEBUG] get (json_path): {var_name_or_path} = {result} (type: {type(result)})", file=sys.stderr)
            
        return result
    else:
        # Simple variable lookup
        result = runtime.current_context.get(var_name_or_path, default)
        
        if runtime.debug:
            print(f"[APL DEBUG] get (context): {var_name_or_path} = {result} (type: {type(result)})", file=sys.stderr)
            
        return result


def set(var_name_or_path: str, value: Any) -> str:
    """Set a variable in context or at a specific JSON path (§7.4 helper function)
    
    If var_name_or_path contains a dot ('.'), it will be treated as a JSON path:
    - The part before the first dot is the variable name to look up in the context
    - The remaining path is used to navigate and set the value in that JSON structure
    
    Otherwise, it's treated as a simple context variable assignment.
    """
    runtime = APLRuntime._current_instance
    if not runtime or runtime.current_context is None:
        if runtime and runtime.debug:
            print(f"[APL DEBUG] set called but no active context: {var_name_or_path} = {value}", file=sys.stderr)
        return ""
    
    # Check if this is a JSON path (contains dot notation)
    if '.' in var_name_or_path:
        # Get the base variable name (part before first dot)
        var_name = var_name_or_path.split('.', 1)[0]
        path = var_name_or_path[len(var_name)+1:]
        
        # Get the data from context, defaulting to empty dict if not exists
        data = runtime.current_context.get(var_name)
        if data is None:
            data = {}
            
        # Navigate the path and set the value
        if not set_json_path(data, path, value):
            if runtime.debug:
                print(f"[APL DEBUG] set failed for path: {path} in {var_name}", file=sys.stderr)
            return ""
            
        # Update the context with modified data
        runtime.current_context[var_name] = data
        
        if runtime.debug:
            print(f"[APL DEBUG] set (json_path): {var_name_or_path} = {value} (type: {type(value)})", file=sys.stderr)
    else:
        # Simple variable assignment
        runtime.current_context[var_name_or_path] = value
        
        if runtime.debug:
            print(f"[APL DEBUG] set (context): {var_name_or_path} = {value} (type: {type(value)})", file=sys.stderr)
    
    return ""  # Return empty string to avoid output in templates


def get_context(var_name: str, default: Any = None) -> Any:
    """Get a context variable (§7.4 helper function)"""
    runtime = APLRuntime._current_instance
    if runtime and runtime.current_context is not None:
        value = runtime.current_context.get(var_name, default)
        if runtime.debug:
            print(f"[APL DEBUG] get_context: {var_name} = {value} (type: {type(value)})", file=sys.stderr)
        return value
    else:
        if runtime and runtime.debug:
            print(f"[APL DEBUG] get_context called but no active context: {var_name}", file=sys.stderr)
        return default


def add(var_name: str, value: Any, default: Any = 0) -> str:
    """Add a value to a context variable, initializing with default if not exists (§7.4 helper function)"""
    runtime = APLRuntime._current_instance
    if runtime and runtime.current_context is not None:
        current_value = runtime.current_context.get(var_name, default)
        new_value = current_value + value
        runtime.current_context[var_name] = new_value
        if runtime.debug:
            print(f"[APL DEBUG] add: {var_name} = {current_value} + {value} = {new_value}", file=sys.stderr)
        return ""  # Return empty string to avoid output in templates
    else:
        if runtime and runtime.debug:
            print(f"[APL DEBUG] add called but no active context: {var_name}", file=sys.stderr)
        return ""


def inc(var_name: str, default: Any = 0) -> str:
    """Increment a context variable by 1, initializing with default if not exists (§7.4 helper function)"""
    runtime = APLRuntime._current_instance
    if runtime and runtime.current_context is not None:
        current_value = runtime.current_context.get(var_name, default)
        new_value = current_value + 1
        runtime.current_context[var_name] = new_value
        if runtime.debug:
            print(f"[APL DEBUG] inc: {var_name} = {current_value} + 1 = {new_value}", file=sys.stderr)
        return ""  # Return empty string to avoid output in templates
    else:
        if runtime and runtime.debug:
            print(f"[APL DEBUG] inc called but no active context: {var_name}", file=sys.stderr)
        return ""


def rem(var_name: str, value: Any, default: Any = 0) -> str:
    """Subtract a value from a context variable, initializing with default if not exists (§7.4 helper function)"""
    runtime = APLRuntime._current_instance
    if runtime and runtime.current_context is not None:
        current_value = runtime.current_context.get(var_name, default)
        new_value = current_value - value
        runtime.current_context[var_name] = new_value
        if runtime.debug:
            print(f"[APL DEBUG] rem: {var_name} = {current_value} - {value} = {new_value}", file=sys.stderr)
        return ""  # Return empty string to avoid output in templates
    else:
        if runtime and runtime.debug:
            print(f"[APL DEBUG] rem called but no active context: {var_name}", file=sys.stderr)
        return ""


def dec(var_name: str, default: Any = 0) -> str:
    """Decrement a context variable by 1, inverse of inc() (§7.4 helper function)"""
    return rem(var_name, 1, default)


# we need to be careful with global scope naming; "next" would override the built-in next() function
def _next(step_name: str) -> str:
    """Set the next step to execute (§7.4 helper function)"""
    return set_context("next_step", step_name)


def _prev() -> str:
    """Gets the previous step name from context (§7.4 helper function)"""
    return get_context("prev_step", None)


def _result(result_type: str = None) -> Any:
    """Get result based on type, defaults to result_text"""
    if result_type:
        return get_context(f"result_{result_type}")
    return get_context("result_text")


class RuntimeError(Exception):
    """Raised when APL template execution fails"""
    pass


class APLRuntime:
    """APL template executor"""
    
    # Class variable to hold the current runtime instance for set_context function
    _current_instance = None
    
    def __init__(self, options: Optional[Dict[str, Any]] = None):
        self.options = options or {}
        self.current_context = None  # Reference to the current execution context
        
        # Default options per §6.1
        self.timeout = self.options.get('timeout', 120000)  # 120 seconds in ms
        self.max_runs = self.options.get('max_runs', float('inf'))
        self.base_url = self.options.get('base_url', 'https://api.openai.com')
        self.api_key = self.options.get('api_key', '<API_KEY>')
        self.debug = self.options.get('debug', False)
        self.relaxed = self.options.get('relaxed', True)  # Enable relaxed syntax mode
        
        # Tool and provider registrations
        self.with_tools = self.options.get('with_tools', {})
        self.with_providers = self.options.get('with_providers', {})
        
        # Jinja2 environment
        self.jinja_env = self.options.get('jinja2_env')
        if self.jinja_env is None:
            self.jinja_env = Environment(loader=BaseLoader(), undefined=StrictUndefined)
            self.jinja_env.enable_async = True  # Enable auto-await for custom coroutines
        
        # Attachment processing regex (§1.2.1)
        self.attachment_pattern = re.compile(r'^@(?P<kind>image_url|audio_input|file)\s+(?P<url>https://\S+)\s*$')
        
    def _debug_log(self, message: str):
        """Log debug message to stderr if debug mode is enabled"""
        if self.debug:
            print(f"[APL DEBUG] {message}", file=sys.stderr)
        
    async def start(self, apl: str) -> Dict[str, Any]:
        """Execute APL template and return final context"""
        self._debug_log("Starting APL execution")
        
        # Set the current instance for set_context function
        APLRuntime._current_instance = self
        
        # Apply relaxed syntax transformation if enabled (§6.1.1)
        transformed_apl = self._transform_relaxed_syntax(apl)
        
        # Parse template
        steps = parse_apl(transformed_apl)
        self._debug_log(f"Parsed {len(steps)} steps: {list(steps.keys())}")
        
        if not steps:
            raise RuntimeError("No steps found in template")
            
        # Initialize context with defaults
        context = self._initialize_context()
        
        # Set the current context reference
        self.current_context = context
        
        # Start execution
        start_time = time.time() * 1000  # milliseconds
        current_step = next(iter(steps.keys()))  # First step
        
        try:
            while current_step and current_step != "return":
                self._debug_log(f"Executing step: {current_step}")
                
                # Check timeout
                elapsed = time.time() * 1000 - start_time
                if elapsed > self.timeout:
                    raise RuntimeError(f"Execution timeout after {elapsed}ms")
                    
                # Check run budget (§2.3)
                if context["global_runs"] >= self.max_runs:
                    raise RuntimeError("Run budget exceeded")
                    
                if current_step not in steps:
                    raise RuntimeError(f"Unknown step: {current_step}")
                    
                step = steps[current_step]
                step_start_time = time.time() * 1000
                
                # Update context for this step
                context["prev_step"] = context.get("current_step")
                context["current_step"] = current_step
                context["time_elapsed_global"] = elapsed
                
                # Reset next_step at the beginning of each step (SPEC § 2.1)
                # This allows the post phase to set a new next_step value
                context["next_step"] = None
                
                # Execute step phases
                await self._execute_step(step, context, start_time, step_start_time)
                
                # Determine next step according to SPEC § 2.1
                if context.get("next_step"):
                    next_step_value = context["next_step"]
                    self._debug_log(f"Found next_step in context: {next_step_value}")
                    current_step = next_step_value
                    self._debug_log(f"Jumping to: {current_step}")
                else:
                    # No next_step set - terminate execution (explicit termination)
                    self._debug_log("No next_step set, terminating execution")
                    current_step = "return"
                        
        except Exception as e:
            context["errors"].append(str(e))
            raise RuntimeError(f"Execution failed: {str(e)}")
            
        # TODO: clarify in SPEC.md because this is interpretation-specific
        # Clear next_step when execution terminates
        context["next_step"] = None
            
        # Update final times
        context["time_elapsed_global"] = time.time() * 1000 - start_time
        
        return context
        
    def _initialize_context(self) -> Dict[str, Any]:
        """Initialize execution context with default variables"""
        context = {
            # Executor-maintained variables
            "prev_step": None,
            "next_step": None,
            "result_text": "",
            "result_json": None,
            "result_tool_calls": [],
            "result_image_urls": [],
            "result_audio_inputs": [],
            "result_files": [],
            "result_role": "",
            "usage": None,
            "runs": 0,
            "global_runs": 0,
            "time_elapsed": 0.0,
            "time_elapsed_global": 0.0,
            "errors": [],
            "prompts": [],
            "tools": [],
            "context": {},
            "context_history": [],
            
            # User-settable variables with defaults
            "model": "gpt-4o",
            "temperature": None,
            "allowed_tools": [],
            "output_mode": None,
            "output_structure": None,
            "max_tokens": None,
            "top_p": None,
            "presence_penalty": None,
            "frequency_penalty": None,
            "top_k": None,
            "repetition_penalty": None,
            "stop_sequences": [],
            "seed": None,
            "logit_bias": {},
        }
        
        # Add all options passed to start() (§6.1)
        # This includes with_tools, with_providers, with_context, debug, max_runs, etc.
        context.update(self.options)
        
        # Ensure with_context options are merged into the main context
        if "with_context" in self.options:
            context.update(self.options["with_context"])
        
        # Add built-in helper functions (§7.4)
        context["get_json_path"] = get_json_path
        context["set_json_path"] = set_json_path
        context["set_context"] = set_context
        context["get_context"] = get_context
        context["get"] = get
        context["set"] = set
        context["add"] = add
        context["rem"] = rem
        context["inc"] = inc
        context["dec"] = dec
        context["next"] = _next
        context["prev"] = _prev
        context["result"] = _result
        
        return context
        
    async def _execute_step(self, step, context: Dict[str, Any], start_time: float, step_start_time: float):
        """Execute a single step (pre -> prompt -> post)"""
        
        # Track step runs (§2.4)
        current_step = context.get("current_step")
        if current_step != context.get("prev_step"):
            # Starting a new step, reset runs counter and errors from previous step
            context["runs"] = 0
            context["errors"] = []
        
        # Increment run counters (§2.4)
        context["runs"] += 1
        context["global_runs"] += 1
        
        # PRE phase
        if step.pre.content.strip():
            context["time_elapsed"] = time.time() * 1000 - step_start_time
            await self._execute_pre_phase(step.pre.content, context)
            
        # PROMPT phase  
        context["time_elapsed"] = time.time() * 1000 - step_start_time
        await self._execute_prompt_phase(step.prompt, context)
        
        # POST phase
        post_executed = False
        if step.post.content.strip():
            context["time_elapsed"] = time.time() * 1000 - step_start_time
            await self._execute_post_phase(step.post.content, context)
            post_executed = True
        
        # Only reset errors if post phase was actually executed (allowing error handling)
        if post_executed:
            context["errors"] = []
            
        # Save context snapshot after post phase (§2.4)
        context_snapshot = {k: v for k, v in context.items() 
                          if k not in ["context", "context_history"]}
        context["context_history"].append(copy.deepcopy(context_snapshot))
            
    async def _execute_pre_phase(self, content: str, context: Dict[str, Any]):
        """Execute pre phase - variable setup"""
        try:
            # Update context reference
            context["context"] = context
            
            # Process template with Jinja handling all control flow naturally
            self._execute_template_sequentially(content, context)
            
            # Update context reference after all variable updates (§2.3)
            context["context"] = context
            
        except Exception as e:
            context["errors"].append(f"Pre phase error: {str(e)}")
    
    def _execute_template_sequentially(self, content: str, context: Dict[str, Any]):
        """Execute template with proper Jinja rendering"""
        try:
            if self.debug:
                print(f"[APL DEBUG] Executing template: {repr(content)}", file=sys.stderr)
            
            # Simply render the entire template at once - let Jinja handle everything
            template = self.jinja_env.from_string(content)
            result = template.render(**context)
            
            if self.debug and result.strip():
                print(f"[APL DEBUG] Template result: {repr(result)}", file=sys.stderr)
                        
        except Exception as e:
            if self.debug:
                print(f"[APL DEBUG] Error executing template: {e}", file=sys.stderr)
            context["errors"].append(f"Template execution error: {str(e)}")
    
    async def _execute_post_phase(self, content: str, context: Dict[str, Any]):
        """Execute post phase - result processing and control flow"""
        try:
            # Update context reference
            context["context"] = context
            
            # Process template sequentially to handle conditional assignments
            self._execute_template_sequentially(content, context)
            
            # Update context reference after all variable updates (§2.3)
            context["context"] = context
            
        except Exception as e:
            context["errors"].append(f"Post phase error: {str(e)}")
            
    async def _execute_prompt_phase(self, prompt_phase, context: Dict[str, Any]):
        """Execute prompt phase - LLM call"""
        try:
            # Update context reference
            context["context"] = context
            
            # Build prompts from roles
            prompts = []
            
            if prompt_phase.role_list:
                # Use role_list for distinct messages (§1.2)
                for role, content in prompt_phase.role_list:
                    # Render Jinja content
                    template = self.jinja_env.from_string(content)
                    rendered_content = template.render(**context)
                    
                    # Process attachments (§1.2.1)
                    lines = rendered_content.split('\n')
                    text_parts = []
                    attachment_parts = []
                    
                    for line in lines:
                        # Check for attachments - must start at column 0, ignore Jinja comments (§1.2.1)
                        attachment_match = self.attachment_pattern.match(line)  # match() checks from start
                        if attachment_match and not line.strip().startswith('{#'):
                            # Convert attachment to OpenAI format
                            kind = attachment_match.group('kind')
                            url = attachment_match.group('url')
                            
                            if kind == "image_url":
                                attachment_parts.append({
                                    "type": "image_url",
                                    "image_url": {"url": url}
                                })
                            elif kind == "audio_input":
                                attachment_parts.append({
                                    "type": "audio_input", 
                                    "audio_input": {"url": url}
                                })
                            elif kind == "file":
                                attachment_parts.append({
                                    "type": "file",
                                    "file": {"url": url}
                                })
                        else:
                            # Regular text content
                            text_parts.append(line)
                    
                    # Build final content
                    text_content = '\n'.join(text_parts).strip()
                    
                    if attachment_parts:
                        # Mixed content with attachments
                        content_value = []
                        if text_content:
                            content_value.append({
                                "type": "text",
                                "text": text_content
                            })
                        content_value.extend(attachment_parts)
                    else:
                        # Text only
                        content_value = text_content
                        
                    prompts.append({
                        "role": role,
                        "content": content_value
                    })
            elif prompt_phase.roles:
                # Fallback to old behavior for backward compatibility
                for role, content in prompt_phase.roles.items():
                    # Render Jinja content
                    template = self.jinja_env.from_string(content)
                    rendered_content = template.render(**context)
                    
                    # Process attachments (§1.2.1)
                    lines = rendered_content.split('\n')
                    text_parts = []
                    attachment_parts = []
                    
                    for line in lines:
                        # Check for attachments - must start at column 0, ignore Jinja comments (§1.2.1)
                        attachment_match = self.attachment_pattern.match(line)  # match() checks from start
                        if attachment_match and not line.strip().startswith('{#'):
                            # Convert attachment to OpenAI format
                            kind = attachment_match.group('kind')
                            url = attachment_match.group('url')
                            
                            if kind == "image_url":
                                attachment_parts.append({
                                    "type": "image_url",
                                    "image_url": {"url": url}
                                })
                            elif kind == "audio_input":
                                attachment_parts.append({
                                    "type": "audio_input", 
                                    "audio_input": {"url": url}
                                })
                            elif kind == "file":
                                attachment_parts.append({
                                    "type": "file",
                                    "file": {"url": url}
                                })
                        else:
                            # Regular text content
                            text_parts.append(line)
                    
                    # Build final content
                    text_content = '\n'.join(text_parts).strip()
                    
                    if attachment_parts:
                        # Mixed content with attachments
                        content_value = []
                        if text_content:
                            content_value.append({
                                "type": "text",
                                "text": text_content
                            })
                        content_value.extend(attachment_parts)
                    else:
                        # Text only
                        content_value = text_content
                        
                    prompts.append({
                        "role": role,
                        "content": content_value
                    })
            else:
                # Default to user role
                template = self.jinja_env.from_string(prompt_phase.content)
                rendered_content = template.render(**context)
                prompts.append({
                    "role": "user", 
                    "content": rendered_content
                })
                
            context["prompts"] = prompts
            
            # Describe tools if any are allowed
            if context["allowed_tools"]:
                context["tools"] = describe_tools(context)
            else:
                context["tools"] = []
                
            # Get provider function
            model = context["model"]
            provider_fn = self.with_providers.get(model)
            
            if not provider_fn:
                provider_fn = get_default_provider()
                
            # Call provider
            response = await provider_fn(context)
            
            # Process response
            await self._process_provider_response(response, context)
            
            # Increment run counters
            context["runs"] += 1
            context["global_runs"] += 1
            
        except Exception as e:
            context["errors"].append(f"Prompt phase error: {str(e)}")
            
    async def _process_provider_response(self, response: Dict[str, Any], context: Dict[str, Any]):
        """Process provider response and update context variables"""
        try:
            if not response or "choices" not in response:
                raise RuntimeError("Invalid provider response format")
                
            choices = response["choices"]
            if not choices:
                raise RuntimeError("No choices in provider response")
                
            message = choices[0].get("message", {})
            
            # Reset result arrays before processing (§2.4)
            context["result_image_urls"] = []
            context["result_audio_inputs"] = []
            context["result_files"] = []
            
            # Extract text content (§2.2.6)
            content = message.get("content", "")
            if isinstance(content, list):
                # Handle multipart content
                text_parts = []
                for part in content:
                    if isinstance(part, dict):
                        if part.get("type") == "text":
                            text_parts.append(part.get("text", ""))
                        elif part.get("type") == "image_url":
                            context["result_image_urls"].append(part.get("image_url", {}).get("url", ""))
                        elif part.get("type") == "audio_input":  
                            context["result_audio_inputs"].append(part.get("audio_input", {}).get("url", ""))
                        elif part.get("type") == "file":
                            context["result_files"].append(part.get("file", {}).get("url", ""))
                content = "\n".join(text_parts)
                
            context["result_text"] = content or ""
            context["result_role"] = message.get("role", "")
            
            # Handle tool calls
            tool_calls = message.get("tool_calls", [])
            if tool_calls:
                context["result_tool_calls"] = await call_tools(tool_calls, context)
            else:
                context["result_tool_calls"] = []
                
            # Handle usage stats
            if "usage" in response:
                context["usage"] = response["usage"]
                
            # Handle JSON output (§2.2.6)
            context["result_json"] = None  # Reset first
            if context.get("output_mode") in ["json", "structured_output"]:
                try:
                    if content.strip():  # Only parse non-empty content
                        parsed_json = json.loads(content)
                        context["result_json"] = parsed_json
                        
                        # Validate schema if structured output (§2.2.6)
                        if context.get("output_mode") == "structured_output" and context.get("output_structure"):
                            validate_schema(parsed_json, context)
                        
                except json.JSONDecodeError as e:
                    context["errors"].append(f"Invalid JSON output: {str(e)}")
                    
        except Exception as e:
            context["errors"].append(f"Response processing error: {str(e)}")
    
    def _transform_relaxed_syntax(self, template: str) -> str:
        """Transform relaxed syntax to valid Jinja2 (§6.1.1)"""
        if not self.relaxed:
            return template
            
        self._debug_log("Applying relaxed syntax transformation")
        
        # Jinja2 control keywords that need {% %} wrapping
        CONTROL_KEYWORDS = {
            'if', 'elif', 'else', 'endif',
            'for', 'endfor', 
            'set', 'endset',
            'with', 'endwith'
        }

        # Function to detect multiline function call starts
        def is_multiline_function_call_start(line):
            # Detect if this line potentially starts a multi-line function call
            # Like set('name', { or set('name', [
            pattern = r'set_context\([\'"].*?[\'"]\s*,\s*[\[{]'
            return bool(re.search(pattern, line))

        def is_function_call_end(line):
            # Detect if this line potentially ends a multi-line function call
            # Like }) or ])
            return bool(re.search(r'[\]}]\s*\)', line.strip()))
        
        # Split the template into sections: pre/prompt/post phases
        sections = []
        current_section = []
        current_phase_type = None
        
        lines = template.split('\n')
        phase_pattern = re.compile(r'^#\s*(pre|prompt|post)\s*:', re.IGNORECASE)
        
        for line in lines:
            phase_match = phase_pattern.match(line)
            if phase_match:
                # Add the previous section if any
                if current_section:
                    sections.append((current_phase_type, current_section))
                    current_section = []
                
                current_phase_type = phase_match.group(1).lower()
                current_section.append(line)
            else:
                current_section.append(line)
                
        # Add the last section
        if current_section:
            sections.append((current_phase_type, current_section))
            
        # Process each section separately
        result_lines = []
        for phase_type, section_lines in sections:
            # Only transform pre/post phases
            if phase_type not in ['pre', 'post']:
                result_lines.extend(section_lines)
                continue
                
            # Only transform if needed
            section_text = '\n'.join(section_lines[1:])  # Skip the phase header
            
            # Check if we need to transform this section
            if self._already_has_jinja_syntax(section_text):
                # Process each line in the context of existing Jinja syntax
                result_lines.append(section_lines[0])  # Add phase header
                
                # Track Jinja block state
                in_jinja_block = False
                for line in section_lines[1:]:
                    stripped = line.strip()
                    # Check if entering or exiting a Jinja block
                    if stripped.startswith('{%'):
                        in_jinja_block = not stripped.endswith('%}') or not any(k in stripped for k in ['endif', 'endfor', 'endset', 'endwith'])
                        result_lines.append(line)
                    # Check if line is inside a Jinja block but not Jinja syntax itself
                    elif in_jinja_block and not stripped.startswith('{{') and not stripped.startswith('{%'):
                        # Transform line inside Jinja block
                        indentation = line[:len(line) - len(line.lstrip())]
                        # Skip empty lines and comments
                        if not stripped or stripped.startswith('{#'):
                            result_lines.append(line)
                        else:
                            first_word = stripped.split()[0] if stripped else ''
                            if first_word in CONTROL_KEYWORDS:
                                result_lines.append(f"{indentation}{{% {stripped} %}}")
                            else:
                                result_lines.append(f"{indentation}{{{{ {stripped} }}}}")
                    else:
                        result_lines.append(line)
            else:
                # Apply standard transformation to all lines
                result_lines.append(section_lines[0])  # Add phase header
                
                # Track multi-line function state
                in_multiline_func = False
                multiline_buffer = []
                indentation = ""
                
                i = 1  # Skip the phase header
                while i < len(section_lines):
                    line = section_lines[i]
                    stripped = line.strip()
                    
                    # Skip empty lines and comments
                    if not stripped or stripped.startswith('{#'):
                        result_lines.append(line)
                        i += 1
                        continue
                        
                    # Skip lines that already have Jinja2 delimiters
                    if stripped.startswith('{{') or stripped.startswith('{%'):
                        result_lines.append(line)
                        i += 1
                        continue
                    
                    # Check for start of multiline function
                    if not in_multiline_func and is_multiline_function_call_start(stripped):
                        in_multiline_func = True
                        indentation = line[:len(line) - len(line.lstrip())]
                        multiline_buffer = [stripped]
                        
                        # Check if it also ends on the same line
                        if is_function_call_end(stripped):
                            result_lines.append(f"{indentation}{{{{ {stripped} }}}}")
                            in_multiline_func = False
                            multiline_buffer = []
                        
                    # Continue collecting multiline function
                    elif in_multiline_func:
                        multiline_buffer.append(stripped)
                        
                        # Check if this line ends the function call
                        if is_function_call_end(stripped):
                            # Wrap the entire multiline function call
                            full_call = " ".join(multiline_buffer)
                            result_lines.append(f"{indentation}{{{{ {full_call} }}}}")
                            in_multiline_func = False
                            multiline_buffer = []
                    
                    # Regular line processing (not in multiline function)
                    else:
                        # Get indentation and first word
                        indentation = line[:len(line) - len(line.lstrip())]
                        first_word = stripped.split()[0] if stripped else ''
                        
                        if first_word in CONTROL_KEYWORDS:
                            result_lines.append(f"{indentation}{{% {stripped} %}}")
                        else:
                            result_lines.append(f"{indentation}{{{{ {stripped} }}}}")
                    
                    i += 1
                
                # If we have an unclosed multiline function at the end, wrap it anyway
                if in_multiline_func and multiline_buffer:
                    full_call = " ".join(multiline_buffer)
                    result_lines.append(f"{indentation}{{{{ {full_call} }}}}")
                        
        transformed = '\n'.join(result_lines)
        self._debug_log("Relaxed syntax transformation complete")
        return transformed
        
    def _already_has_jinja_syntax(self, text: str) -> bool:
        """Check if a text already has Jinja syntax that needs to be preserved"""
        # Look for typical Jinja patterns
        has_jinja = '{{' in text or '{%' in text
        
        # Check for balanced delimiters - this helps determine if we should
        # transform a section or leave it alone because it already has Jinja syntax
        curly_count = text.count('{{') - text.count('}}')
        control_count = text.count('{%') - text.count('%}')
        
        # Special case for multi-line set_context with complex data structures
        set_context_pattern = re.compile(r'{{\s*set_context\(.*?\[|\{', re.DOTALL)
        has_multiline_set = bool(set_context_pattern.search(text))
        
        if has_multiline_set:
            # For multi-line set_context, we always consider it has proper Jinja syntax
            return True
            
        # Check for specific pattern that matches the failing test - standalone set_context with multiline dict/array
        # This ensures we don't try to transform these multiline expressions
        multiline_pattern = re.compile(r'set_context\([\'"].*?[\'"],\s*[\[{]', re.DOTALL)
        has_multiline_expr = bool(multiline_pattern.search(text))
        
        if has_multiline_expr:
            return False  # Let the standard line-by-line transform handle this
            
        return has_jinja and curly_count == 0 and control_count == 0


async def start(apl: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute APL template and return final context"""
    runtime = APLRuntime(options)
    return await runtime.start(apl)


def check(apl: str, options: Optional[Dict[str, Any]] = None) -> bool:
    """Validate APL template syntax. Returns True on success, raises ValidationError on failure."""
    try:
        # Apply relaxed syntax transformation if enabled
        runtime = APLRuntime(options or {})
        transformed_apl = runtime._transform_relaxed_syntax(apl)
        parse_apl(transformed_apl)
        return True
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError(f"Parse error: {str(e)}")
