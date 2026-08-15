use regex::Regex;

use crate::asl::{Asl, NodeKind};
use crate::rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};
use crate::span::Span;

/// §21.5: final-period removal in paragraphs and list items, plus markdown
/// blank-line collapse. Both are conservative:
///
/// - a final "." only becomes a candidate when the block contains another
///   accepted edit (sibling gate, resolved later) — untouched sentences
///   stay byte-identical (§28.4 negative fixtures);
/// - blank-line collapse only fires outside quotes/code and only shortens
///   runs of 2+ blank lines to one.
pub fn generate(
    asl: &Asl,
    input: &str,
    final_period_enabled: bool,
    blank_line_enabled: bool,
) -> Vec<Candidate> {
    let mut out = Vec::new();
    if final_period_enabled {
        out.extend(final_period_candidates(asl));
    }
    if blank_line_enabled {
        out.extend(blank_line_candidates(asl, input));
    }
    out
}

fn final_period_candidates(asl: &Asl) -> Vec<Candidate> {
    let mut out = Vec::new();
    for node in &asl.nodes {
        if !matches!(
            node.kind,
            NodeKind::Paragraph | NodeKind::MarkdownListItem
        ) {
            continue;
        }
        // last sentence of the block
        let last_sentence = node
            .children
            .iter()
            .rev()
            .find(|&&c| asl.node(c).kind == NodeKind::Sentence);
        let Some(&sid) = last_sentence else { continue };
        let tokens = &asl.node(sid).children;
        // last non-whitespace token of the sentence
        let last = tokens
            .iter()
            .rev()
            .find(|&&t| {
                !matches!(
                    asl.node(t).kind,
                    NodeKind::Whitespace | NodeKind::Newline
                )
            })
            .copied();
        let Some(dot) = last else { continue };
        let dot_node = asl.node(dot);
        let is_final_period = dot_node.kind == NodeKind::Symbol
            && dot_node.text.as_deref() == Some(".");
        if !is_final_period {
            continue;
        }
        // the token before must be word-like ("..." stays untouched)
        let dot_idx = tokens.iter().position(|&t| t == dot).unwrap();
        let prev_word = tokens[..dot_idx]
            .iter()
            .rev()
            .find(|&&t| {
                !matches!(
                    asl.node(t).kind,
                    NodeKind::Whitespace | NodeKind::Newline
                )
            })
            .map(|&t| asl.node(t).kind.is_word_like())
            .unwrap_or(false);
        if !prev_word {
            continue;
        }
        if dot_node.meta.protected {
            continue;
        }
        out.push(Candidate {
            id: 0,
            rule_id: "shared.punctuation.final_period".to_string(),
            phase: Phase::Punctuation,
            priority: 100,
            layer: TransformLayer::Symbol,
            target_nodes: vec![dot],
            target_span: dot_node.span,
            kind: CandidateKind::Remove,
            replacement: Some(String::new()),
            safety: SafetyClass::Safe,
            requires_sibling_edit: true,
            allowed_in_protected: false,
        });
    }
    out
}

fn blank_line_candidates(asl: &Asl, input: &str) -> Vec<Candidate> {
    let mut out = Vec::new();
    // 2+ blank lines (3+ newlines incl. optional whitespace) -> one blank line
    let re = Regex::new(r"\n([ \t]*\n){2,}").unwrap();
    for m in re.find_iter(input) {
        let span = Span::new(m.start(), m.end());
        if asl.intersects_protected(&span) {
            continue;
        }
        out.push(Candidate {
            id: 0,
            rule_id: "shared.markdown.blank_line_collapse".to_string(),
            phase: Phase::Punctuation,
            priority: 100,
            layer: TransformLayer::Whitespace,
            target_nodes: Vec::new(),
            target_span: span,
            kind: CandidateKind::CompactWhitespace,
            replacement: Some("\n\n".to_string()),
            safety: SafetyClass::Safe,
            requires_sibling_edit: false,
            allowed_in_protected: false,
        });
    }
    out
}
