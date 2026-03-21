export { isProbablyBinary } from "./binary.js";
export {
  shouldSkipSensitivePath,
  normalizeGlobPath,
  FAST_GLOB_IGNORE_PATTERNS,
  MAX_FILE_SIZE_BYTES,
} from "./ignore.js";
export { findOccurrences, countByMatch, applyOccurrences } from "./matcher.js";
export { REPLACEMENT_RULES, REPLACEMENT_RULE_MAP } from "./replacements.js";
export { scanDirectory } from "./scanner.js";
export type { ReplacementRule, MatchOccurrence, ScanResult } from "./types.js";
