# apl_parser.py
"""
Universal Prompt Language (APL) Parser
 
This module provides a parser for APL (A Programming Language) workflow files.
It reads a text file containing workflow steps and extracts the pre, prompt, and post phases.

Usage:
```python
from apl_parser import parse_apl
ast = parse_apl(open("workflow.apl").read())
print(ast["greet"].prompt.user)
```
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Final

# ── pre-compiled patterns ─────────────────────────────────────────────────────
PHASE_RE: Final  = re.compile(r'^\s*#\s*(pre|prompt|post)\s*:\s*(.*?)\s*$', re.I)
SUB_RE:   Final  = re.compile(r'^\s*##\s*(system|user)\s*(?:[:\-\s]*)$', re.I)
DASH_RE:  Final  = re.compile(r'^\s*---\s*$')
NUM_RE:   Final  = re.compile(r'^-?\d+(?:\.\d+)?$')

@dataclass
class Prompt:
    system: str = ''
    user:   str = ''

@dataclass
class Step:
    name: str
    slug: str
    pre_meta: Dict[str, object] = field(default_factory=dict)
    pre_code: str = ''
    prompt: Prompt = field(default_factory=Prompt)
    post_code: str = ''

# ── helpers ───────────────────────────────────────────────────────────────────
def _slug(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')

def _cast(val: str):
    val = val.strip()
    if val.startswith('[') and val.endswith(']'):
        return [x.strip() for x in val[1:-1].split(',') if x.strip()]
    if NUM_RE.match(val):
        return float(val) if '.' in val else int(val)
    return val

def _parse_meta(lines: List[str], i: int) -> Tuple[Dict[str, object], int]:
    meta: Dict[str, object] = {}
    i += 1                                            # skip leading ---
    while i < len(lines) and not DASH_RE.match(lines[i]):
        if ':' in lines[i]:
            k, v = lines[i].split(':', 1)
            meta[k.strip()] = _cast(v)
        i += 1
    return meta, i + 1                                # skip closing ---

# ── main ──────────────────────────────────────────────────────────────────────
def parse_apl(text: str) -> Dict[str, Step]:
    lines = text.splitlines()
    steps: Dict[str, Step] = {}
    i, n = 0, len(lines)

    while i < n:
        m = PHASE_RE.match(lines[i])
        if not m:                                     # unrelated line
            i += 1
            continue

        phase, raw_name = m.group(1).lower(), m.group(2).strip()
        step = steps.setdefault(raw_name, Step(raw_name, _slug(raw_name)))
        i += 1

        # ── PRE ────────────────────────────────────────────────────────────
        if phase == 'pre':
            if i < n and DASH_RE.match(lines[i]):            # meta block
                meta, i = _parse_meta(lines, i)
                step.pre_meta.update(meta)
            buf = []
            while i < n and not PHASE_RE.match(lines[i]):
                buf.append(lines[i]); i += 1
            step.pre_code = '\n'.join(buf).rstrip()

        # ── PROMPT ─────────────────────────────────────────────────────────
        elif phase == 'prompt':
            cur: str | None = None
            buf: List[str] = []
            def flush():
                if cur:
                    setattr(step.prompt, cur, '\n'.join(buf).rstrip())
            while i < n and not PHASE_RE.match(lines[i]):
                s = SUB_RE.match(lines[i])
                if s:
                    flush()
                    cur, buf = s.group(1).lower(), []
                    i += 1
                    continue
                buf.append(lines[i]); i += 1
            flush()

        # ── POST ───────────────────────────────────────────────────────────
        else:  # post
            buf = []
            while i < n and not PHASE_RE.match(lines[i]):
                buf.append(lines[i]); i += 1
            step.post_code = '\n'.join(buf).rstrip()

    return steps