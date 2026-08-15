use crate::asl::{Asl, NodeKind};
use crate::rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};
use crate::span::Span;

/// JSON code-fence minification (§21.4): parse + compact serialize.
/// Unparseable bodies are left unchanged.
pub fn generate(asl: &Asl, input: &str, enabled: bool) -> Vec<Candidate> {
    if !enabled {
        return Vec::new();
    }
    fence_bodies(asl, input, "json")
        .into_iter()
        .filter_map(|(span, body)| {
            let value: serde_json::Value = serde_json::from_str(&body).ok()?;
            let mut compact = serde_json::to_string(&value).ok()?;
            if body.ends_with('\n') {
                compact.push('\n');
            }
            if compact == body || compact.len() >= body.len() {
                return None;
            }
            Some(Candidate {
                id: 0,
                rule_id: "shared.codefence.json.minify".to_string(),
                phase: Phase::CodefenceFormat,
                priority: 150,
                layer: TransformLayer::Block,
                target_nodes: Vec::new(),
                target_span: span,
                kind: CandidateKind::CompactStructuredFormat,
                replacement: Some(compact),
                safety: SafetyClass::Safe,
                requires_sibling_edit: false,
            allowed_in_protected: true,
            })
        })
        .collect()
}

/// (body span, body text) for every code fence with the given preamble.
pub(crate) fn fence_bodies(asl: &Asl, input: &str, preamble: &str) -> Vec<(Span, String)> {
    let mut out = Vec::new();
    for node in &asl.nodes {
        if node.kind != NodeKind::CodeFence {
            continue;
        }
        let pre = node
            .meta
            .attrs
            .get("preamble")
            .map(|s| s.as_str())
            .unwrap_or("");
        if pre != preamble {
            continue;
        }
        for &child in &node.children {
            let c = asl.node(child);
            if c.kind == NodeKind::CodeFenceBody {
                out.push((c.span, input[c.span.start..c.span.end].to_string()));
            }
        }
    }
    out
}
