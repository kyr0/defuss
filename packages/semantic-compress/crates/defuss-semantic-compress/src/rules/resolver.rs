use crate::asl::{Asl, NodeKind};
use crate::rules::candidate::{Candidate, CandidateKind};
use crate::trace::RejectedCandidate;

/// Deterministic conflict resolution (§15).
///
/// Sort order (ascending = better):
///   class rank, layer rank, -priority, -span length,
///   replacement UTF-8 length, replacement text, rule_id, span start.
/// Greedy interval acceptance: a candidate loses to any already-accepted
/// overlapping candidate.
pub fn resolve(asl: &Asl, candidates: Vec<Candidate>) -> (Vec<Candidate>, Vec<RejectedCandidate>) {
    let mut sorted = candidates;
    sorted.sort_by(|a, b| rank_key(a).cmp(&rank_key(b)));

    let protected = asl.protected_spans();
    let mut accepted: Vec<Candidate> = Vec::new();
    let mut rejected: Vec<RejectedCandidate> = Vec::new();

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
        for win in &accepted {
            if win.target_span.overlaps(&cand.target_span) {
                rejected.push(RejectedCandidate {
                    rule_id: cand.rule_id.clone(),
                    rejected: true,
                    reason: format!(
                        "overlapped_by_higher_priority_{}",
                        kind_reason(win.kind)
                    ),
                    span: cand.target_span,
                });
                continue 'outer;
            }
        }
        accepted.push(cand);
    }

    // Sibling-edit post-pass: a gated candidate (final-period punctuation)
    // survives only when its enclosing block also contains at least one
    // accepted non-gated candidate.
    let non_gated_spans: Vec<crate::span::Span> = accepted
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
    }
}

type RankKey = (
    u8,
    u8,
    std::cmp::Reverse<i32>,
    std::cmp::Reverse<usize>,
    usize,
    String,
    String,
    usize,
);

fn rank_key(c: &Candidate) -> RankKey {
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
