use crate::asl::{Asl, NodeKind};
use crate::rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};
use crate::span::Span;

/// Markdown table pipe-space compression (§21.6). Preserves structure:
/// header row, alignment row incl. alignment markers, row count, column
/// count and empty cells. Never converts to CSV.
///
/// Normal form per row: no leading/trailing pipe, `|` separators, no
/// surrounding spaces, e.g. `Name|Age|City` and `---|---:|---`.
pub fn generate(asl: &Asl, input: &str, enabled: bool) -> Vec<Candidate> {
    if !enabled {
        return Vec::new();
    }
    let mut out = Vec::new();
    for node in &asl.nodes {
        if node.kind != NodeKind::MarkdownTable {
            continue;
        }
        for &row_id in &node.children {
            let row = asl.node(row_id);
            if row.kind != NodeKind::MarkdownTableRow {
                continue;
            }
            let original = &input[row.span.start..row.span.end];
            let compressed = compress_row(original);
            if compressed != original && compressed.len() < original.len() {
                out.push(Candidate {
                    id: 0,
                    rule_id: "shared.markdown.table.compress".to_string(),
                    phase: Phase::MarkdownTable,
                    priority: 100,
                    layer: TransformLayer::Block,
                    target_nodes: row.children.clone(),
                    target_span: Span::new(row.span.start, row.span.end),
                    kind: CandidateKind::CompactStructuredFormat,
                    replacement: Some(compressed),
                    safety: SafetyClass::Safe,
                    requires_sibling_edit: false,
            allowed_in_protected: false,
            confidence: 1.0,
            review_on_low_confidence: true,
                });
            }
        }
    }
    out
}

fn compress_row(line: &str) -> String {
    let t = line.trim();
    let t = t.strip_prefix('|').unwrap_or(t);
    let t = t.strip_suffix('|').unwrap_or(t);
    t.split('|')
        .map(|cell| cell.trim())
        .collect::<Vec<_>>()
        .join("|")
}
