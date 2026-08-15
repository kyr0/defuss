use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

// rules/{lang}/lexicon.json — see classify::lexicon::Lexicon.

/// rules/{lang}/bad_words.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BadWordsJson {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    pub language: String,
    pub words: Vec<String>,
}

/// rules/{lang}/grammar_rules.json (§11, §20.1)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrammarRulesJson {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    pub language: String,
    #[serde(default)]
    pub classify_rules: Vec<ClassifyRuleJson>,
    #[serde(default)]
    pub named_entities: Vec<String>,
    /// word that introduces prepositional / infinitive phrases ("to" in en)
    #[serde(default)]
    pub particle_word: Option<String>,
    #[serde(default)]
    pub infinitive_verbs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassifyRuleJson {
    pub id: String,
    #[serde(default = "default_confidence")]
    pub confidence: f32,
    /// folded word this rule targets (e.g. "that")
    pub target: String,
    /// regexes; the previous word token must match one of them
    #[serde(default)]
    pub before: Vec<String>,
    /// regexes; the next word token must match one of them
    #[serde(default)]
    pub after: Vec<String>,
    pub classify_as: String,
    #[serde(default)]
    pub protect: bool,
    /// Also protect every token after the matched word in its sentence
    /// (used by the complementizer rule: the clause after "that" is
    /// semantically load-bearing and stays untouched in safe mode).
    #[serde(default)]
    pub protect_following: bool,
}

/// rules/{lang}/replacements.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplacementsJson {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    pub language: String,
    pub rules: Vec<RuleJson>,
}

/// rules/{lang}/politeness_phrases.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolitenessJson {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    pub language: String,
    #[serde(default)]
    pub action_words: Vec<String>,
    pub rules: Vec<RuleJson>,
}

/// rules/{lang}/paths.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathsJson {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    pub rules: Vec<RuleJson>,
}

/// A transformation rule (§12, §20). Rules never mutate text; they emit
/// candidate transformations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleJson {
    pub id: String,
    pub phase: String,
    /// "Remove" | "Replace"
    pub kind: String,
    /// "Line" | "Block" | "Phrase" | "Word" | "Symbol" | "Whitespace"
    pub layer: String,
    #[serde(default)]
    pub priority: i32,

    /// 0.0..1.0 confidence (§11). Candidates below the configured
    /// `min_confidence` are downgraded to Review (traced, not applied).
    #[serde(default = "default_confidence")]
    pub confidence: f32,

    /// When false, below-threshold candidates are dropped entirely instead
    /// of being downgraded to Review (§11.1). Default: true (review).
    #[serde(default = "default_true")]
    pub review_on_low_confidence: bool,

    /// Preconditions (§10.2): what the rule needs, not just what it forbids.
    #[serde(default)]
    pub requires: Option<RequiresJson>,

    /// Token-sequence pattern (sequence rules).
    #[serde(default, rename = "match")]
    pub match_pattern: Vec<MatchElemJson>,

    /// Raw-text regex (raw rules, e.g. paths).
    #[serde(default)]
    pub regex: Option<String>,

    #[serde(default)]
    pub replacement: Option<String>,

    #[serde(default)]
    pub guards: GuardsJson,

    /// Symbols absorbed into the removal span before the match (e.g. ",").
    #[serde(default)]
    pub absorb_leading_symbols: Vec<String>,
    /// Symbols absorbed into the removal span after the match.
    #[serde(default)]
    pub absorb_trailing_symbols: Vec<String>,

    /// "start": match must begin at sentence start.
    /// "end": match must end at sentence end (a trailing "." is allowed).
    #[serde(default)]
    pub anchor: Option<String>,

    #[serde(default)]
    pub partial_match: bool,
}

/// Rule preconditions (§10.2).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RequiresJson {
    /// Candidate's first target must have an enclosing Sentence.
    #[serde(default)]
    pub has_sentence_parent: bool,
    /// All target words must have been classified from this language.
    #[serde(default)]
    pub language: Option<String>,
    /// This candidate may not remove more than this fraction of its
    /// sentence's words.
    #[serde(default)]
    pub max_removal_ratio: Option<f32>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MatchElemJson {
    #[serde(default)]
    pub word: Option<String>,
    #[serde(default)]
    pub regex: Option<String>,
    #[serde(default)]
    pub class: Option<String>,
    #[serde(default)]
    pub normalized: Option<String>,
    #[serde(default)]
    pub symbol: Option<String>,
    #[serde(default)]
    pub whitespace: Option<bool>,
    #[serde(default)]
    pub optional: Option<bool>,
    #[serde(default)]
    pub optional_if_class: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GuardsJson {
    #[serde(default)]
    pub forbidden_ancestors: Vec<String>,
    #[serde(default)]
    pub required_ancestors: Vec<String>,
    #[serde(default)]
    pub forbidden_tags: Vec<String>,
    #[serde(default)]
    pub required_tags: Vec<String>,
    #[serde(default)]
    pub requires_utf8_saving: bool,
    #[serde(default)]
    pub min_utf8_saving: Option<usize>,
    #[serde(default)]
    pub requires_non_empty_sentence: bool,
    #[serde(default)]
    pub requires_following_action_word: bool,
}

/// rules/shared/markdown.json — toggles for programmatic markdown transforms.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SharedMarkdownJson {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    #[serde(default = "default_true")]
    pub blank_line_collapse: bool,
    #[serde(default = "default_true")]
    pub table_compress: bool,
    #[serde(default = "default_true")]
    pub final_period: bool,
    #[serde(default = "default_true")]
    pub docstring_collapse: bool,
}

impl Default for SharedMarkdownJson {
    fn default() -> Self {
        SharedMarkdownJson {
            schema_version: default_schema_version(),
            blank_line_collapse: true,
            table_compress: true,
            final_period: true,
            docstring_collapse: true,
        }
    }
}

/// rules/shared/codefence_formats.json — which fence formats get compressed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SharedCodefenceFormatsJson {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    #[serde(default)]
    pub formats: BTreeMap<String, bool>,
}

fn default_true() -> bool {
    true
}

fn default_confidence() -> f32 {
    1.0
}

fn default_schema_version() -> String {
    "1.0".to_string()
}
