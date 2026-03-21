import { describe, it, expect } from 'vitest';

import { REPLACEMENT_RULES, REPLACEMENT_RULE_MAP } from '../src/replacements.js';

describe('REPLACEMENT_RULES', () => {
  it('contains rules for all major categories', () => {
    const descriptions = REPLACEMENT_RULES.map((r) => r.description);

    expect(descriptions).toContain('em dash');
    expect(descriptions).toContain('right arrow');
    expect(descriptions).toContain('left double quote');
    expect(descriptions).toContain('ellipsis');
    expect(descriptions).toContain('no-break space');
    expect(descriptions).toContain('zero-width space');
    expect(descriptions).toContain('byte-order mark');
    expect(descriptions).toContain('heavy check mark');
  });

  it('has no duplicate match strings', () => {
    const matches = REPLACEMENT_RULES.map((r) => r.match);
    expect(new Set(matches).size).toBe(matches.length);
  });

  it('every rule has a non-empty match and description', () => {
    for (const rule of REPLACEMENT_RULES) {
      expect(rule.match.length).toBeGreaterThan(0);
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });
});

describe('REPLACEMENT_RULE_MAP', () => {
  it('has same size as REPLACEMENT_RULES', () => {
    expect(REPLACEMENT_RULE_MAP.size).toBe(REPLACEMENT_RULES.length);
  });

  it('maps match to replacement correctly', () => {
    expect(REPLACEMENT_RULE_MAP.get('\u2014')).toBe('-');
    expect(REPLACEMENT_RULE_MAP.get('\u2192')).toBe('=>');
    expect(REPLACEMENT_RULE_MAP.get('\u2026')).toBe('...');
    expect(REPLACEMENT_RULE_MAP.get('\u201C')).toBe('"');
  });
});
