use crate::asl::Asl;
use crate::rules::candidate::{Candidate, Phase};
use crate::rules::matcher::MatchContext;
use crate::rules::schema::RuleJson;

/// Path compression (§21.8): explicit configured regex replacements only.
pub fn generate(asl: &Asl, ctx: &MatchContext, rules: &[RuleJson]) -> Vec<Candidate> {
    super::generate_rule_candidates(asl, ctx, rules, Phase::Paths)
}
