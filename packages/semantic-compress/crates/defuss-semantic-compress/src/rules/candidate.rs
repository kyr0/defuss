use crate::asl::NodeId;
use crate::span::Span;
use serde::{Deserialize, Serialize};

pub type CandidateId = u32;

/// Application phases (§17). Ordering is informational; candidate resolution
/// is governed by class/layer/priority, not phase order.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Phase {
    Parse = 0,
    ClassifyLanguage = 1,
    ClassifyGrammar = 2,
    CodefenceFormat = 3,
    RepeatLines = 4,
    Contractions = 5,
    Politeness = 6,
    DetFiller = 7,
    BadWords = 8,
    MarkdownTable = 9,
    Punctuation = 10,
    Paths = 11,
    Docstrings = 12,
    Resolve = 13,
    Write = 14,
    SafetyCheck = 15,
}

impl Phase {
    pub fn from_str(s: &str) -> Option<Phase> {
        use Phase::*;
        Some(match s {
            "parse" => Parse,
            "classify_language" | "classify_language_and_lexicon" => ClassifyLanguage,
            "grammar" | "classify_grammar" => ClassifyGrammar,
            "codefence_format" | "codefence_formats" => CodefenceFormat,
            "repeat_lines" => RepeatLines,
            "contractions" => Contractions,
            "politeness" => Politeness,
            "det_filler" => DetFiller,
            "bad_words" => BadWords,
            "markdown_table" => MarkdownTable,
            "punctuation" => Punctuation,
            "paths" => Paths,
            "docstrings" => Docstrings,
            _ => return None,
        })
    }

    pub fn as_str(&self) -> &'static str {
        use Phase::*;
        match self {
            Parse => "parse",
            ClassifyLanguage => "classify_language",
            ClassifyGrammar => "grammar",
            CodefenceFormat => "codefence_format",
            RepeatLines => "repeat_lines",
            Contractions => "contractions",
            Politeness => "politeness",
            DetFiller => "det_filler",
            BadWords => "bad_words",
            MarkdownTable => "markdown_table",
            Punctuation => "punctuation",
            Paths => "paths",
            Docstrings => "docstrings",
            Resolve => "resolve",
            Write => "write",
            SafetyCheck => "safety_check",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CandidateKind {
    Remove,
    Replace,
    CompactWhitespace,
    CompactStructuredFormat,
    RepeatCompress,
}

impl CandidateKind {
    pub fn from_str(s: &str) -> Option<CandidateKind> {
        use CandidateKind::*;
        Some(match s {
            "Remove" => Remove,
            "Replace" => Replace,
            "CompactWhitespace" => CompactWhitespace,
            "CompactStructuredFormat" => CompactStructuredFormat,
            "RepeatCompress" => RepeatCompress,
            _ => return None,
        })
    }

    pub fn as_str(&self) -> &'static str {
        use CandidateKind::*;
        match self {
            Remove => "Remove",
            Replace => "Replace",
            CompactWhitespace => "CompactWhitespace",
            CompactStructuredFormat => "CompactStructuredFormat",
            RepeatCompress => "RepeatCompress",
        }
    }

    /// Conflict-resolution class rank (§15.1): lower wins.
    pub fn rank(&self) -> u8 {
        use CandidateKind::*;
        match self {
            Remove => 0,
            CompactStructuredFormat => 1,
            RepeatCompress => 2,
            Replace => 3,
            CompactWhitespace => 4,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransformLayer {
    Line,
    Block,
    Phrase,
    Word,
    Symbol,
    Whitespace,
}

impl TransformLayer {
    pub fn from_str(s: &str) -> Option<TransformLayer> {
        use TransformLayer::*;
        Some(match s {
            "Line" => Line,
            "Block" => Block,
            "Phrase" => Phrase,
            "Word" => Word,
            "Symbol" => Symbol,
            "Whitespace" => Whitespace,
            _ => return None,
        })
    }

    pub fn as_str(&self) -> &'static str {
        use TransformLayer::*;
        match self {
            Line => "Line",
            Block => "Block",
            Phrase => "Phrase",
            Word => "Word",
            Symbol => "Symbol",
            Whitespace => "Whitespace",
        }
    }

    /// Conflict-resolution layer rank (§15.2): lower wins.
    pub fn rank(&self) -> u8 {
        use TransformLayer::*;
        match self {
            Line => 0,
            Block => 1,
            Phrase => 2,
            Word => 3,
            Symbol => 4,
            Whitespace => 5,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SafetyClass {
    /// Only safe transformations ship in v1.
    Safe,
}

/// A proposed transformation. Never applied directly; the writer decides.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Candidate {
    pub id: CandidateId,
    pub rule_id: String,
    pub phase: Phase,

    pub priority: i32,
    pub layer: TransformLayer,

    pub target_nodes: Vec<NodeId>,
    pub target_span: Span,

    pub kind: CandidateKind,

    pub replacement: Option<String>,

    pub safety: SafetyClass,

    /// Punctuation candidates only fire when a sibling edit exists in the
    /// same block (keeps §28.4 negative fixtures byte-identical).
    #[serde(default)]
    pub requires_sibling_edit: bool,

    /// Programmatic code-fence format candidates only: allows targeting a
    /// CodeFenceBody span even though the fence is protected (§8.1 format
    /// exceptions). Never set by JSON rules.
    #[serde(default)]
    pub allowed_in_protected: bool,
}
