use crate::asl::Asl;
use crate::rules::candidate::{Candidate, Phase};
use crate::rules::matcher::MatchContext;
use crate::rules::schema::RuleJson;

/// Politeness phrase removal (§21.2): phrase-level removal candidates from
/// the politeness rules of the active packs.
pub fn generate(asl: &Asl, ctx: &MatchContext, rules: &[RuleJson]) -> Vec<Candidate> {
    super::generate_rule_candidates(asl, ctx, rules, Phase::Politeness)
}
