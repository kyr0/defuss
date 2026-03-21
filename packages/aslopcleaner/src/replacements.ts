import type { ReplacementRule } from './types.js';

export const REPLACEMENT_RULES: readonly ReplacementRule[] = [
  { match: '—', replacement: '-', description: 'em dash' },
  { match: '–', replacement: '-', description: 'en dash' },
  { match: '‒', replacement: '-', description: 'figure dash' },
  { match: '―', replacement: '--', description: 'horizontal bar' },
  { match: '‐', replacement: '-', description: 'hyphen' },
  { match: '‑', replacement: '-', description: 'non-breaking hyphen' },
  { match: '−', replacement: '-', description: 'minus sign' },

  { match: '→', replacement: '=>', description: 'right arrow' },
  { match: '⇒', replacement: '=>', description: 'double right arrow' },
  { match: '⟶', replacement: '=>', description: 'long right arrow' },
  { match: '➜', replacement: '=>', description: 'heavy right arrow' },
  { match: '➔', replacement: '=>', description: 'black right arrow' },
  { match: '➝', replacement: '=>', description: 'drafting right arrow' },

  { match: '✔', replacement: '-', description: 'heavy check mark' },
  { match: '✅', replacement: '-', description: 'check mark button' },
  { match: '☑', replacement: '-', description: 'ballot box with check' },
  { match: '✓', replacement: '-', description: 'check mark' },
  { match: '•', replacement: '-', description: 'bullet' },
  { match: '‣', replacement: '-', description: 'triangular bullet' },
  { match: '◦', replacement: '-', description: 'white bullet' },
  { match: '▪', replacement: '-', description: 'small square bullet' },
  { match: '·', replacement: '-', description: 'middle dot bullet' },
  { match: '●', replacement: '-', description: 'black circle bullet' },
  { match: '○', replacement: '-', description: 'white circle bullet' },

  { match: '“', replacement: '"', description: 'left double quote' },
  { match: '”', replacement: '"', description: 'right double quote' },
  { match: '„', replacement: '"', description: 'low double quote' },
  { match: '‟', replacement: '"', description: 'double high-reversed-9 quote' },
  { match: '«', replacement: '"', description: 'left guillemet' },
  { match: '»', replacement: '"', description: 'right guillemet' },
  { match: '‹', replacement: "'", description: 'left single guillemet' },
  { match: '›', replacement: "'", description: 'right single guillemet' },
  { match: '‘', replacement: "'", description: 'left single quote' },
  { match: '’', replacement: "'", description: 'right single quote / apostrophe' },
  { match: '‚', replacement: "'", description: 'low single quote' },
  { match: '‛', replacement: "'", description: 'single high-reversed-9 quote' },

  { match: '…', replacement: '...', description: 'ellipsis' },

  { match: '≤', replacement: '<=', description: 'less-than-or-equal' },
  { match: '≥', replacement: '>=', description: 'greater-than-or-equal' },
  { match: '≠', replacement: '!=', description: 'not-equal' },

  { match: '\u00A0', replacement: ' ', description: 'no-break space' },
  { match: '\u202F', replacement: ' ', description: 'narrow no-break space' },
  { match: '\u2007', replacement: ' ', description: 'figure space' },
  { match: '\u200B', replacement: '', description: 'zero-width space' },
  { match: '\u200C', replacement: '', description: 'zero-width non-joiner' },
  { match: '\u200D', replacement: '', description: 'zero-width joiner' },
  { match: '\u2060', replacement: '', description: 'word joiner' },
  { match: '\uFEFF', replacement: '', description: 'byte-order mark' }
] as const;

export const REPLACEMENT_RULE_MAP = new Map(
  REPLACEMENT_RULES.map((rule) => [rule.match, rule.replacement] as const)
);
