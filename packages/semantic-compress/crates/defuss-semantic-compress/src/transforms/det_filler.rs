use std::collections::BTreeMap;

use crate::asl::{Asl, NodeId};
use crate::rules::candidate::{Candidate, Phase};
use crate::rules::matcher::MatchContext;
use crate::rules::schema::RuleJson;

/// DET/FILLER removal (§21.1): class-based removal candidates from the
/// det_filler-phase rules of the active packs.
pub fn generate(asl: &Asl, ctx: &MatchContext, rules: &[RuleJson]) -> Vec<Candidate> {
    super::generate_rule_candidates(asl, ctx, rules, Phase::DetFiller)
}

/// Cross-phase guard: when det/filler/bad-word candidates would remove every
/// word of a sentence, keep the sentence's first word (§21.1 "reject when the
/// sentence would become empty", applied to the combined removal set).
pub fn prevent_empty_sentences(asl: &Asl, candidates: Vec<Candidate>) -> Vec<Candidate> {
    // sentence id -> indices into candidates
    let mut by_sentence: BTreeMap<NodeId, Vec<usize>> = BTreeMap::new();
    for (idx, cand) in candidates.iter().enumerate() {
        if let Some(&first) = cand.target_nodes.first() {
            if let Some(sid) = asl.enclosing_sentence(first) {
                by_sentence.entry(sid).or_default().push(idx);
            }
        }
    }
    let mut drop: Vec<usize> = Vec::new();
    for (sid, idxs) in &by_sentence {
        let sentence_words: Vec<NodeId> = asl
            .node(*sid)
            .children
            .iter()
            .copied()
            .filter(|&c| asl.node(c).kind.is_word_like())
            .collect();
        if sentence_words.is_empty() {
            continue;
        }
        let all_covered = sentence_words.iter().all(|w| {
            idxs.iter()
                .any(|&i| candidates[i].target_nodes.contains(w))
        });
        if all_covered {
            // keep the first word: drop the candidate targeting it
            let first_word = sentence_words[0];
            if let Some(&i) = idxs
                .iter()
                .find(|&&i| candidates[i].target_nodes.contains(&first_word))
            {
                drop.push(i);
            }
        }
    }
    candidates
        .into_iter()
        .enumerate()
        .filter(|(i, _)| !drop.contains(i))
        .map(|(_, c)| c)
        .collect()
}
