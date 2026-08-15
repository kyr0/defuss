use std::collections::BTreeMap;

use crate::asl::{Asl, NodeKind};
use crate::rules::candidate::{Candidate, CandidateKind};
use crate::span::Span;
use crate::trace::RejectedCandidate;

/// Interval index over accepted spans for fast overlap detection (§13.7).
///
/// Backed by a BTreeMap keyed by span start with a running max-end index;
/// queries scan only intervals starting before the query end and prune via
/// max-end — O(log n + m + k) instead of the O(n²) all-pairs scan, where
/// m = intervals starting before the query end and k = overlaps found.
#[derive(Debug, Default)]
pub struct SpanIndex {
    /// span start -> span end (accepted spans never overlap, so starts are
    /// unique after resolution)
    by_start: BTreeMap<usize, usize>,
    max_end: usize,
}

impl SpanIndex {
    pub fn new() -> Self {
        SpanIndex::default()
    }

    /// Build an index from (start, end, id) triples (§13.7 API compatibility).
    pub fn build(entries: &[(usize, usize, crate::asl::NodeId)]) -> Self {
        let mut idx = SpanIndex::new();
        for (s, e, _) in entries {
            idx.insert(Span::new(*s, *e));
        }
        idx
    }

    pub fn insert(&mut self, span: Span) {
        self.by_start.insert(span.start, span.end);
        self.max_end = self.max_end.max(span.end);
    }

    /// All indexed spans overlapping `span`.
    pub fn find_overlapping(&self, span: Span) -> Vec<Span> {
        if span.start >= self.max_end {
            return Vec::new();
        }
        self.by_start
            .range(..span.end)
            .filter(|(_, e)| **e > span.start)
            .map(|(s, e)| Span::new(*s, *e))
            .collect()
    }
}

/// Deterministic conflict resolution (§15).
///
/// Sort order (ascending = better):
///   class rank, layer rank, -priority, -span length,
///   replacement UTF-8 length, replacement text, rule_id, span start.
/// Greedy interval acceptance against a SpanIndex of accepted spans.
/// Review-kind candidates are excluded upstream (confidence/budget filters).
pub fn resolve(asl: &Asl, candidates: Vec<Candidate>) -> (Vec<Candidate>, Vec<RejectedCandidate>) {
    let mut sorted: Vec<Candidate> = candidates
        .into_iter()
        .filter(|c| c.kind != CandidateKind::Review)
        .collect();
    sorted.sort_by(|a, b| rank_key(a).cmp(&rank_key(b)));

    let protected = asl.protected_spans();
    let mut accepted: Vec<Candidate> = Vec::new();
    let mut rejected: Vec<RejectedCandidate> = Vec::new();
    let mut index = SpanIndex::new();
    // accepted candidate kinds by span start, for rejection reasons
    let mut winner_kinds: BTreeMap<usize, CandidateKind> = BTreeMap::new();

    'outer: for cand in sorted {
        // safety net: never touch protected spans
        if !cand.allowed_in_protected && protected.iter().any(|p| p.overlaps(&cand.target_span)) {
            rejected.push(RejectedCandidate {
                rule_id: cand.rule_id.clone(),
                rejected: true,
                reason: "intersects_protected_span".to_string(),
                span: cand.target_span,
            });
            continue;
        }
        for overlap in index.find_overlapping(cand.target_span) {
            let winner = winner_kinds.get(&overlap.start).copied();
            rejected.push(RejectedCandidate {
                rule_id: cand.rule_id.clone(),
                rejected: true,
                reason: format!(
                    "overlapped_by_higher_priority_{}",
                    winner.map(kind_reason).unwrap_or("candidate")
                ),
                span: cand.target_span,
            });
            continue 'outer;
        }
        index.insert(cand.target_span);
        winner_kinds.insert(cand.target_span.start, cand.kind);
        accepted.push(cand);
    }

    // Sibling-edit post-pass: a gated candidate (final-period punctuation)
    // survives only when its enclosing block also contains at least one
    // accepted non-gated candidate.
    let non_gated_spans: Vec<Span> = accepted
        .iter()
        .filter(|c| !c.requires_sibling_edit)
        .map(|c| c.target_span)
        .collect();
    let mut result: Vec<Candidate> = Vec::new();
    for cand in accepted.into_iter() {
        if !cand.requires_sibling_edit {
            result.push(cand);
            continue;
        }
        let block = cand.target_nodes.first().and_then(|&n| {
            asl.enclosing_of_kinds(n, &[NodeKind::Paragraph, NodeKind::MarkdownListItem])
        });
        let sibling_exists = block
            .map(|b| {
                let bs = asl.node(b).span;
                non_gated_spans.iter().any(|s| s.overlaps(&bs))
            })
            .unwrap_or(false);
        if sibling_exists {
            result.push(cand);
        } else {
            rejected.push(RejectedCandidate {
                rule_id: cand.rule_id.clone(),
                rejected: true,
                reason: "no_sibling_edit_in_block".to_string(),
                span: cand.target_span,
            });
        }
    }
    (result, rejected)
}

fn kind_reason(kind: CandidateKind) -> &'static str {
    match kind {
        CandidateKind::Remove => "removal",
        CandidateKind::CompactStructuredFormat => "structured_compaction",
        CandidateKind::RepeatCompress => "repeat_compression",
        CandidateKind::Replace => "replacement",
        CandidateKind::CompactWhitespace => "whitespace_compaction",
        CandidateKind::Review => "review",
    }
}

pub type RankKey = (
    u8,
    u8,
    std::cmp::Reverse<i32>,
    std::cmp::Reverse<usize>,
    usize,
    String,
    String,
    usize,
);

pub fn rank_key(c: &Candidate) -> RankKey {
    (
        c.kind.rank(),
        c.layer.rank(),
        std::cmp::Reverse(c.priority),
        std::cmp::Reverse(c.target_span.len()),
        c.replacement.as_deref().map(|r| r.len()).unwrap_or(0),
        c.replacement.clone().unwrap_or_default(),
        c.rule_id.clone(),
        c.target_span.start,
    )
}
