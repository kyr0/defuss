use crate::asl::Asl;
use crate::rules::candidate::{Candidate, Phase};
use crate::rules::matcher::MatchContext;
use crate::rules::schema::RuleJson;

/// Bad-word removal (§21.10): word-level removal candidates for words
/// classified as BadWord.
pub fn generate(asl: &Asl, ctx: &MatchContext, rules: &[RuleJson]) -> Vec<Candidate> {
    super::generate_rule_candidates(asl, ctx, rules, Phase::BadWords)
}
