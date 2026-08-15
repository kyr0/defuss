use crate::asl::Asl;
use crate::rules::candidate::{Candidate, Phase};
use crate::rules::matcher::MatchContext;
use crate::rules::schema::RuleJson;

/// Contractions (§21.3): replacement candidates from contraction rules.
/// Negation contractions are not shipped in v1.
pub fn generate(asl: &Asl, ctx: &MatchContext, rules: &[RuleJson]) -> Vec<Candidate> {
    super::generate_rule_candidates(asl, ctx, rules, Phase::Contractions)
}
