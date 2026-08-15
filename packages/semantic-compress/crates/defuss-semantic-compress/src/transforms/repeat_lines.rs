use crate::asl::Asl;
use crate::parse::block::split_lines;
use crate::rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};
use crate::span::Span;

/// Exact consecutive line repeat compression (§21.7). Only byte-identical,
/// consecutive, non-empty lines. Runs intersecting protected spans (code
/// fences, blockquotes) are skipped — protected text stays byte-identical.
pub fn generate(asl: &Asl, input: &str) -> Vec<Candidate> {
    let lines = split_lines(input);
    let mut protected = asl.protected_spans();
    // table rows are structured data (§21.6 preserves row count) — treat
    // them as protected for repeat compression
    protected.extend(
        asl.nodes
            .iter()
            .filter(|n| n.kind == crate::asl::NodeKind::MarkdownTable)
            .map(|n| n.span),
    );
    protected.sort_by_key(|s| s.start);
    let mut out = Vec::new();
    let mut i = 0;
    while i < lines.len() {
        let line = &lines[i];
        let text = line.text(input);
        if text.is_empty() {
            i += 1;
            continue;
        }
        let mut j = i + 1;
        while j < lines.len() && lines[j].text(input) == text {
            j += 1;
        }
        let count = j - i;
        if count >= 2 {
            let span = Span::new(line.start, lines[j - 1].end);
            let replacement = format!("{text} x{count}");
            let intersects = protected.iter().any(|p| p.overlaps(&span));
            if !intersects && replacement.len() < span.len() {
                out.push(Candidate {
                    id: 0,
                    rule_id: "shared.repeat_lines.compress".to_string(),
                    phase: Phase::RepeatLines,
                    priority: 400,
                    layer: TransformLayer::Line,
                    target_nodes: Vec::new(),
                    target_span: span,
                    kind: CandidateKind::RepeatCompress,
                    replacement: Some(replacement),
                    safety: SafetyClass::Safe,
                    requires_sibling_edit: false,
            allowed_in_protected: false,
            confidence: 1.0,
            review_on_low_confidence: true,
                });
            }
        }
        i = j.max(i + 1);
    }
    out
}
