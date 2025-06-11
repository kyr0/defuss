#!/usr/bin/env python3
"""
APL CLI - Command line interface for APL execution
"""

import argparse
import asyncio
import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, Optional

from .runtime import start, check
from .parser import ValidationError
from .runtime import RuntimeError


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load configuration from file"""
    if not config_path:
        # Look for config in current directory
        for name in ["apl.config.json", "apl.json", ".apl.json"]:
            if os.path.exists(name):
                config_path = name
                break
    
    if config_path and os.path.exists(config_path):
        with open(config_path, 'r') as f:
            return json.load(f)
    
    return {}


def load_tools_from_file(tools_file: str) -> Dict[str, Any]:
    """Load tool definitions from Python file"""
    import importlib.util
    
    spec = importlib.util.spec_from_file_location("tools", tools_file)
    if spec is None or spec.loader is None:
        raise ValueError(f"Could not load tools from {tools_file}")
    
    tools_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(tools_module)
    
    # Extract tools - look for TOOLS dict or functions
    tools = {}
    
    if hasattr(tools_module, 'TOOLS'):
        tools.update(tools_module.TOOLS)
    else:
        # Auto-discover functions
        for name in dir(tools_module):
            obj = getattr(tools_module, name)
            if callable(obj) and not name.startswith('_'):
                tools[name] = {"fn": obj}
    
    return tools


async def execute_apl(args: argparse.Namespace) -> int:
    """Execute APL template"""
    try:
        # Read template
        if args.template == '-':
            template = sys.stdin.read()
        else:
            with open(args.template, 'r') as f:
                template = f.read()
        
        # Validate if requested
        if args.check:
            try:
                check(template)
                print("✓ Template validation passed")
                return 0
            except ValidationError as e:
                print(f"✗ Template validation failed: {e}")
                return 1
        
        # Load configuration
        config = load_config(args.config)
        
        # Build options
        options = {
            "max_timeout": args.timeout * 1000,  # Convert to ms
            "max_runs": args.max_runs,
            "with_tools": {},
            "with_providers": {}
        }
        
        # Load tools if specified
        if args.tools:
            options["with_tools"] = load_tools_from_file(args.tools)
        elif "tools" in config:
            # Tools specified in config
            options["with_tools"] = load_tools_from_file(config["tools"])
        
        # Set environment variables for providers
        if args.openai_key:
            os.environ["OPENAI_API_KEY"] = args.openai_key
        
        # Execute template
        result = await start(template, options)
        
        # Output results
        if args.output == "json":
            # Full JSON output
            print(json.dumps(result, indent=2, default=str))
        elif args.output == "text":
            # Just the result text
            print(result["result_text"])
        elif args.output == "summary":
            # Summary format
            print(f"Result: {result['result_text']}")
            print(f"Runs: {result['global_runs']}")
            print(f"Time: {result['time_elapsed_global']:.0f}ms")
            if result["errors"]:
                print(f"Errors: {len(result['errors'])}")
                for error in result["errors"]:
                    print(f"  - {error}")
        
        return 0 if not result["errors"] else 1
        
    except ValidationError as e:
        print(f"Validation error: {e}", file=sys.stderr)
        return 1
    except RuntimeError as e:
        print(f"Runtime error: {e}", file=sys.stderr)
        return 1
    except FileNotFoundError as e:
        print(f"File not found: {e}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nInterrupted", file=sys.stderr)
        return 130
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="APL (Agentic Prompting Language) CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  apl my_agent.apl                    # Execute APL template
  apl my_agent.apl --check            # Validate template only
  apl my_agent.apl --output json      # Full JSON output
  cat template.apl | apl -            # Read from stdin
  apl template.apl --tools tools.py   # Use custom tools
        """
    )
    
    parser.add_argument(
        "template",
        help="APL template file (or '-' for stdin)"
    )
    
    parser.add_argument(
        "--check", "-c",
        action="store_true",
        help="Validate template syntax only"
    )
    
    parser.add_argument(
        "--output", "-o",
        choices=["text", "json", "summary"],
        default="summary",
        help="Output format (default: summary)"
    )
    
    parser.add_argument(
        "--config",
        help="Configuration file path"
    )
    
    parser.add_argument(
        "--tools",
        help="Python file containing tool definitions"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=120,
        help="Execution timeout in seconds (default: 120)"
    )
    
    parser.add_argument(
        "--max-runs",
        type=int,
        default=100,
        help="Maximum number of LLM runs (default: 100)"
    )
    
    parser.add_argument(
        "--openai-key",
        help="OpenAI API key (or set OPENAI_API_KEY env var)"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="APL CLI 1.1.0"
    )
    
    args = parser.parse_args()
    
    # Run async main
    return asyncio.run(execute_apl(args))


if __name__ == "__main__":
    sys.exit(main())
