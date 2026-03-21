import type { MatchOccurrence, ReplacementRule } from "./types.js";

export function findOccurrences(
  content: string,
  rules: readonly ReplacementRule[],
): MatchOccurrence[] {
  const matches: MatchOccurrence[] = [];

  for (const rule of rules) {
    let index = content.indexOf(rule.match);
    if (index === -1) {
      continue;
    }

    while (index !== -1) {
      matches.push({ index, match: rule.match });
      index = content.indexOf(rule.match, index + rule.match.length);
    }
  }

  matches.sort((a, b) => a.index - b.index || a.match.length - b.match.length);
  return matches;
}

export function countByMatch(
  matches: readonly MatchOccurrence[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const match of matches) {
    counts.set(match.match, (counts.get(match.match) ?? 0) + 1);
  }

  return counts;
}

export function applyOccurrences(
  content: string,
  matches: readonly MatchOccurrence[],
  replacements: ReadonlyMap<string, string>,
): string {
  if (matches.length === 0) {
    return content;
  }

  let cursor = 0;
  let output = "";

  for (const occurrence of matches) {
    if (occurrence.index < cursor) {
      continue;
    }

    const replacement = replacements.get(occurrence.match);
    if (replacement === undefined) {
      continue;
    }

    output += content.slice(cursor, occurrence.index);
    output += replacement;
    cursor = occurrence.index + occurrence.match.length;
  }

  output += content.slice(cursor);
  return output;
}
