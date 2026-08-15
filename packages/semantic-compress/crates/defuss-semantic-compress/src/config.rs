use std::path::PathBuf;

/// Token counter selection. `Simple` is a deterministic, model-agnostic
/// counter (words + symbols) — it is an estimate, not an LLM tokenizer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenCounterKind {
    Simple,
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

    pub emit_trace: bool,
    pub emit_rejected_candidates: bool,

    pub token_counter: Option<TokenCounterKind>,
}

impl Default for CompressConfig {
    fn default() -> Self {
        CompressConfig {
            lang: None,
            rules_path: None,
            enable_markdown: true,
            enable_codefence_formats: true,
            emit_trace: false,
            emit_rejected_candidates: false,
            token_counter: None,
        }
    }
}
