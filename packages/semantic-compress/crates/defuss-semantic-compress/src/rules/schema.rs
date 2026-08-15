use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

// rules/{lang}/lexicon.json — see classify::lexicon::Lexicon.

/// rules/{lang}/bad_words.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BadWordsJson {
    pub language: String,
    pub words: Vec<String>,
}

/// rules/{lang}/grammar_rules.json (§11, §20.1)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrammarRulesJson {
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
    pub language: String,
    pub rules: Vec<RuleJson>,
}

/// rules/{lang}/politeness_phrases.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolitenessJson {
    pub language: String,
    #[serde(default)]
    pub action_words: Vec<String>,
    pub rules: Vec<RuleJson>,
}

/// rules/{lang}/paths.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathsJson {
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
    #[serde(default)]
    pub formats: BTreeMap<String, bool>,
}

fn default_true() -> bool {
    true
}
