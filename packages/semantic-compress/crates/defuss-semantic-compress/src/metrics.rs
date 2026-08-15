use serde::{Deserialize, Serialize};

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
