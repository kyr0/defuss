use crate::asl::Asl;
use crate::config::CompressConfig;
use crate::rules::candidate::{Candidate, CandidateKind};

/// Confidence filter (§15.1.3): candidates below `min_confidence` are
/// downgraded to `Review` kind before resolution — they are traced but
/// never applied and never win conflicts. Rules with
/// `review_on_low_confidence: false` are dropped entirely instead.
///
/// Returns the downgraded-to-Review candidates (for trace/reporting).
pub fn apply_confidence_filter(candidates: &mut Vec<Candidate>, min_confidence: f32) -> Vec<Candidate> {
    let mut downgraded = Vec::new();
    let mut kept = Vec::with_capacity(candidates.len());
    for mut cand in candidates.drain(..) {
        if cand.confidence < min_confidence && cand.kind != CandidateKind::Review {
            if cand.review_on_low_confidence {
                cand.kind = CandidateKind::Review;
                downgraded.push(cand);
                continue;
            }
            // dropped entirely
            continue;
        }
        kept.push(cand);
    }
    *candidates = kept;
    downgraded
}

/// Compression budget enforcement (§13.8, §15.1.4). Runs before resolution:
/// projects the exact output (through the resolver + WritePlan, so junction
/// whitespace repair is accounted for), and if the budget
/// (`min_output_ratio` / `max_removal_tokens`) would be violated, the
/// lowest-ranked candidates are downgraded to Review until it is satisfied.
///
/// Returns the downgraded candidates (for trace/reporting).
pub fn enforce_budget(
    asl: &Asl,
    input: &str,
    candidates: &mut Vec<Candidate>,
    config: &CompressConfig,
) -> Vec<Candidate> {
    if input.is_empty() {
        return Vec::new();
    }
    let mut downgraded = Vec::new();

    loop {
        let (projected_out, removed_tokens) = project(asl, input, candidates);
        let ratio_ok =
            projected_out as f32 >= config.min_output_ratio * input.len() as f32;
        let tokens_ok = match config.max_removal_tokens {
            Some(cap) => removed_tokens <= cap,
            None => true,
        };
        if ratio_ok && tokens_ok {
            break;
        }
        // downgrade the lowest-ranked (worst) remaining candidate
        let worst = candidates
            .iter()
            .enumerate()
            .filter(|(_, c)| c.kind != CandidateKind::Review)
            .max_by(|(_, a), (_, b)| {
                crate::rules::resolver::rank_key(a).cmp(&crate::rules::resolver::rank_key(b))
            })
            .map(|(i, _)| i);
        match worst {
            Some(idx) => {
                let mut cand = candidates.remove(idx);
                cand.kind = CandidateKind::Review;
                downgraded.push(cand);
            }
            None => break, // nothing left to downgrade
        }
    }
    downgraded
}

/// Exact projection: resolve + build the WritePlan, then measure.
/// Returns (projected output bytes, removed token count).
fn project(asl: &Asl, input: &str, candidates: &[Candidate]) -> (usize, usize) {
    let (accepted, _) = crate::rules::resolver::resolve(asl, candidates.to_vec());
    let (plan, _) = crate::rules::writer::plan(input, asl, &accepted);
    let removed_tokens: usize = accepted
        .iter()
        .map(|c| {
            asl.nodes
                .iter()
                .filter(|n| n.text.is_some())
                .filter(|n| {
                    (n.kind.is_word_like() || n.kind == crate::asl::NodeKind::Symbol)
                        && n.span.start >= c.target_span.start
                        && n.span.end <= c.target_span.end
                })
                .count()
        })
        .sum();
    (plan.output_len(), removed_tokens)
}
