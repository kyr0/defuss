use serde::{Deserialize, Serialize};

use crate::asl::{Asl, NodeKind};
use crate::rules::candidate::Candidate;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Metrics {
    pub input_bytes: usize,
    pub output_bytes: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_tokens: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_tokens: Option<usize>,
    pub candidates_generated: usize,
    pub candidates_accepted: usize,
    pub candidates_rejected: usize,
    /// Number of safety violations caught by final checks (§23).
    pub safety_violations: usize,
    /// Per-section metrics (§24): one entry per top-level block.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub sections: Vec<SectionMetrics>,
}

/// Per-top-level-block metrics (§24).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionMetrics {
    /// lowercase block kind: "paragraph", "codefence", "quote", ...
    pub kind: String,
    pub input_bytes: usize,
    pub output_bytes: usize,
    pub candidates_generated: usize,
    pub candidates_applied: usize,
}

impl Metrics {
    pub fn byte_saving(&self) -> usize {
        self.input_bytes.saturating_sub(self.output_bytes)
    }

    pub fn byte_saving_ratio(&self) -> f64 {
        if self.input_bytes == 0 {
            0.0
        } else {
            self.byte_saving() as f64 / self.input_bytes as f64
        }
    }

    pub fn token_saving(&self) -> Option<usize> {
        match (self.input_tokens, self.output_tokens) {
            (Some(i), Some(o)) => Some(i.saturating_sub(o)),
            _ => None,
        }
    }
}

/// Deterministic, model-agnostic token estimate: words + symbols.
pub fn simple_token_count(asl: &crate::asl::Asl) -> usize {
    asl.nodes
        .iter()
        .filter(|n| n.text.is_some())
        .filter(|n| n.kind.is_word_like() || n.kind == crate::asl::NodeKind::Symbol)
        .count()
}

/// Computes per-section metrics over the top-level blocks of the document.
pub fn compute_sections(
    asl: &Asl,
    generated: &[Candidate],
    accepted: &[Candidate],
) -> Vec<SectionMetrics> {
    let root_children = asl.node(asl.root).children.clone();
    let mut sections = Vec::new();
    for cid in root_children {
        let node = asl.node(cid);
        // only real content blocks, not stray separators
        if matches!(
            node.kind,
            NodeKind::Paragraph
                | NodeKind::CodeFence
                | NodeKind::Quote
                | NodeKind::MarkdownHeading
                | NodeKind::MarkdownList
                | NodeKind::MarkdownTable
        ) {
            let span = node.span;
            let applied: Vec<&Candidate> = accepted
                .iter()
                .filter(|c| c.target_span.overlaps(&span))
                .collect();
            let removed: usize = applied
                .iter()
                .map(|c| {
                    c.target_span
                        .len()
                        .saturating_sub(c.replacement.as_deref().map(|r| r.len()).unwrap_or(0))
                })
                .sum();
            sections.push(SectionMetrics {
                kind: format!("{:?}", node.kind).to_lowercase(),
                input_bytes: span.len(),
                output_bytes: span.len().saturating_sub(removed),
                candidates_generated: generated
                    .iter()
                    .filter(|c| c.target_span.overlaps(&span))
                    .count(),
                candidates_applied: applied.len(),
            });
        }
    }
    sections
}
