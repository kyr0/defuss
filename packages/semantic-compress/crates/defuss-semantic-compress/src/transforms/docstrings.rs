use regex::Regex;

use crate::asl::Asl;
use crate::rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};
use crate::span::Span;

/// Docstring wrapper collapse (§21.9): multiline docstring wrappers with a
/// single content line become one-liners:
///
/// ```text
/// /**
///  * Foo
///  */
/// ```
/// becomes `/** Foo */`.
///
/// Comment text is never rewritten or deleted; multi-line bodies are left
/// untouched. Only fires outside protected spans.
pub fn generate(asl: &Asl, input: &str, enabled: bool) -> Vec<Candidate> {
    if !enabled {
        return Vec::new();
    }
    let mut out = Vec::new();
    // opening line, exactly one content line, closing line
    let re = Regex::new(r"(?m)/\*\*[ \t]*\r?\n[ \t]*\*?[ \t]*(\S[^\n]*?)[ \t]*\r?\n[ \t]*\*/").unwrap();
    for caps in re.captures_iter(input) {
        let m = caps.get(0).unwrap();
        let span = Span::new(m.start(), m.end());
        if asl.intersects_protected(&span) {
            continue;
        }
        let content = caps.get(1).map(|c| c.as_str().trim()).unwrap_or("");
        // never emit a wrapper when the content itself closes the comment
        if content.contains("*/") {
            continue;
        }
        let replacement = format!("/** {content} */");
        if replacement.len() >= span.len() {
            continue;
        }
        out.push(Candidate {
            id: 0,
            rule_id: "shared.docstring.collapse".to_string(),
            phase: Phase::Docstrings,
            priority: 100,
            layer: TransformLayer::Block,
            target_nodes: Vec::new(),
            target_span: span,
            kind: CandidateKind::CompactWhitespace,
            replacement: Some(replacement),
            safety: SafetyClass::Safe,
            requires_sibling_edit: false,
            allowed_in_protected: false,
        });
    }
    out
}
