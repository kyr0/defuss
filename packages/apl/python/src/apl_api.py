# apl_api.py
"""
Minimal global registries for provider and tool callbacks.
No third-party dependencies; thread-safe via the stdlib `threading` module.
"""

from typing import Callable, Dict, List, Optional
from threading import RLock

ProviderFn = Callable[[str, str, dict, list], str]   # (prompt, model, params, tools) → str
ToolFn     = Callable[..., str]

# ---------- global registries ----------
_providers: Dict[str, ProviderFn] = {}
_tools: Dict[str, ToolFn] = {}

_lock = RLock()


# ---------- provider registry ----------
def add_provider(model: str, fn: ProviderFn) -> None:
    """Register / overwrite a provider callback for a model name."""
    with _lock:
        _providers[model] = fn


def remove_provider(model: str) -> None:
    with _lock:
        _providers.pop(model, None)


def get_provider(model: str) -> Optional[ProviderFn]:
    return _providers.get(model)


def list_providers() -> List[str]:
    return list(_providers.keys())


# ---------- tool registry --------------
def add_tool(name: str, fn: ToolFn) -> None:
    with _lock:
        _tools[name] = fn


def remove_tool(name: str) -> None:
    with _lock:
        _tools.pop(name, None)


def get_tool(name: str) -> Optional[ToolFn]:
    return _tools.get(name)


def list_tools() -> List[str]:
    return list(_tools.keys())
