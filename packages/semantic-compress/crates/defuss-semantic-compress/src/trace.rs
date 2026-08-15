use crate::asl::NodeId;
use crate::span::Span;
use serde::{Deserialize, Serialize};

/// One accepted transformation, emitted for observability (§24).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceEvent {
    pub rule_id: String,
    pub phase: String,
    pub kind: String,
    pub layer: String,
    pub before: String,
    pub after: String,
    pub span: Span,
    pub node_ids: Vec<NodeId>,
    pub priority: i32,
}

/// A candidate that lost conflict resolution (debug mode only).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RejectedCandidate {
    pub rule_id: String,
    pub rejected: bool,
    pub reason: String,
    pub span: Span,
}
