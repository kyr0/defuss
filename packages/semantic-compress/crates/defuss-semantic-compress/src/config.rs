use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Token counter selection. `Simple` is a deterministic, model-agnostic
/// counter (words + symbols) — it is an estimate, not an LLM tokenizer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenCounterKind {
    Simple,
}

/// Controls how strictly code fences and other structures are protected
/// (§5.2).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ParserMode {
    /// Code fences are fully protected — no prose transforms inside (not
    /// even in `markdown` fences). Quotes are fully protected.
    /// This is the default and safest mode.
    #[default]
    FullProtection,

    /// Code fences are protected except for markdown-formatted fences,
    /// which may have safe prose transforms applied (v1 default behavior).
    PartialProtection,

    /// Code fences are parsed for compression but not protected.
    /// Format minifiers (json/css/html) still apply; raw-text rules
    /// (paths, repeat lines, docstrings) may also fire inside fences.
    MinimalProtection,
}

/// Strategy for handling malformed input (§6.1).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ParseStrategy {
    /// Fail on any parse error (strict).
    Strict,
    /// Continue parsing with best-effort, marking malformed regions as
    /// Unknown. Unknown regions are protected by default — they pass
    /// through unchanged.
    BestEffort,
}

#[derive(Debug, Clone)]
pub struct CompressConfig {
    /// Active language pack (e.g. "en"). `None` activates all bundled packs
    /// with cross-language ambiguity cancellation.
    pub lang: Option<String>,
    /// External rules directory. When set, packs are loaded from disk
    /// instead of the embedded defaults.
    pub rules_path: Option<PathBuf>,

    pub enable_markdown: bool,
    pub enable_codefence_formats: bool,

    /// Parser protection mode. Default: FullProtection (§21).
    pub parser_mode: ParserMode,
    /// Parse strategy for malformed input. Default: BestEffort.
    pub parse_strategy: ParseStrategy,

    pub emit_trace: bool,
    pub emit_rejected_candidates: bool,

    /// Compression budget: output must be ≥ this ratio of input (bytes).
    /// Default: 0.1 (10%).
    pub min_output_ratio: f32,
    /// Cap absolute token removals (Simple token counting).
    /// None = unlimited.
    pub max_removal_tokens: Option<usize>,
    /// Minimum confidence for candidates to be applied. Below this,
    /// candidates are downgraded to Review kind (traced, not applied).
    ///
    /// Default: 0.8 — all shipped rules apply (det/filler rules carry
    /// confidence 0.85). Note: the v2 plan suggests 0.9, but that would
    /// downgrade the shipped DET/FILLER rules and contradict §18.1 / §26.3
    /// fixture expectations; 0.8 keeps default behavior consistent.
    pub min_confidence: f32,

    pub token_counter: Option<TokenCounterKind>,

    /// Additional rule pack paths for composition (§23). Loaded in addition
    /// to the builtin/filesystem packs.
    pub extra_rules: Vec<PathBuf>,
}

impl Default for CompressConfig {
    fn default() -> Self {
        CompressConfig {
            lang: None,
            rules_path: None,
            enable_markdown: true,
            enable_codefence_formats: true,
            parser_mode: ParserMode::FullProtection,
            parse_strategy: ParseStrategy::BestEffort,
            emit_trace: false,
            emit_rejected_candidates: false,
            min_output_ratio: 0.1,
            max_removal_tokens: None,
            min_confidence: 0.8,
            token_counter: None,
            extra_rules: Vec::new(),
        }
    }
}
