import { describe, it, expect } from 'vitest';

import { applyOccurrences, countByMatch, findOccurrences } from '../src/matcher.js';
import { REPLACEMENT_RULE_MAP, REPLACEMENT_RULES } from '../src/replacements.js';

describe('findOccurrences', () => {
  it('locates repeated symbols with indexOf-style scanning', () => {
    const content = 'A \u2192 B \u2014 C \u2026 \u201Cquote\u201D \u2714';
    const matches = findOccurrences(content, REPLACEMENT_RULES);

    expect(matches.map((m) => ({ index: m.index, match: m.match }))).toEqual([
      { index: 2, match: '\u2192' },
      { index: 6, match: '\u2014' },
      { index: 10, match: '\u2026' },
      { index: 12, match: '\u201C' },
      { index: 18, match: '\u201D' },
      { index: 20, match: '\u2714' },
    ]);
  });

  it('returns empty array when no matches', () => {
    const matches = findOccurrences('plain ASCII text', REPLACEMENT_RULES);
    expect(matches).toEqual([]);
  });

  it('finds multiple instances of same symbol', () => {
    const matches = findOccurrences('\u2714 \u2714 \u2714', REPLACEMENT_RULES);
    expect(matches).toHaveLength(3);
  });
});

describe('applyOccurrences', () => {
  it('rebuilds the file content with ASCII replacements', () => {
    const content = '\u201Chello\u201D \u2192 world\u2026';
    const matches = findOccurrences(content, REPLACEMENT_RULES);
    const updated = applyOccurrences(content, matches, REPLACEMENT_RULE_MAP);

    expect(updated).toBe('"hello" => world...');
  });

  it('returns original content when no matches', () => {
    const content = 'plain text';
    const updated = applyOccurrences(content, [], REPLACEMENT_RULE_MAP);
    expect(updated).toBe('plain text');
  });

  it('handles overlapping index gracefully', () => {
    const content = '\u2714\u2714';
    const matches = findOccurrences(content, REPLACEMENT_RULES);
    const updated = applyOccurrences(content, matches, REPLACEMENT_RULE_MAP);
    expect(updated).toBe('[OK][OK]');
  });

  it('skips occurrences with unknown replacement', () => {
    const content = 'test';
    const fakeMatches = [{ index: 0, match: '\uFFFF' }];
    const updated = applyOccurrences(content, fakeMatches, REPLACEMENT_RULE_MAP);
    expect(updated).toBe('test');
  });
});

describe('countByMatch', () => {
  it('aggregates counts per Unicode symbol', () => {
    const content = '\u2714 \u2714 \u2713';
    const matches = findOccurrences(content, REPLACEMENT_RULES);
    const counts = countByMatch(matches);

    expect(counts.get('\u2714')).toBe(2);
    expect(counts.get('\u2713')).toBe(1);
  });

  it('returns empty map for no matches', () => {
    const counts = countByMatch([]);
    expect(counts.size).toBe(0);
  });
});
