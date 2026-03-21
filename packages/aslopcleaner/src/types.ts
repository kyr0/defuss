export interface ReplacementRule {
  readonly match: string;
  readonly replacement: string;
  readonly description: string;
}

export interface MatchOccurrence {
  readonly index: number;
  readonly match: string;
}

export interface ScanResult {
  readonly matchesByFile: Map<string, MatchOccurrence[]>;
  readonly scannedFiles: number;
  readonly skippedByGlob: number;
  readonly skippedBySensitivePattern: number;
  readonly skippedBySize: number;
  readonly skippedByBinary: number;
}
