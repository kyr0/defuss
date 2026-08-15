pub mod bad_words;
pub mod codefence_css;
pub mod codefence_html;
pub mod codefence_json;
pub mod contractions;
pub mod det_filler;
pub mod docstrings;
pub mod markdown_table;
pub mod paths;
pub mod politeness;
pub mod punctuation;
pub mod repeat_lines;

use crate::asl::Asl;
use crate::rules::candidate::{Candidate, Phase};
use crate::rules::matcher::{
    compile_raw_rule, compile_rule, generate_raw_candidates, generate_seq_candidates, MatchContext,
};
use crate::rules::schema::RuleJson;

/// Runs all JSON rules of one phase through the generic matcher.
///
/// Overlay mode loads every pack, so identical class rules (e.g.
/// `en.det.remove` / `de.det.remove`) would otherwise generate duplicate
/// candidates. Rules with an identical (kind, layer, pattern) signature are
/// deduplicated; the first pack's rule id wins deterministically.
pub(crate) fn generate_rule_candidates(
    asl: &Asl,
    ctx: &MatchContext,
    rules: &[RuleJson],
    phase: Phase,
) -> Vec<Candidate> {
    let mut out = Vec::new();
    let mut seen: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    for rule in rules.iter().filter(|r| Phase::from_str(&r.phase) == Some(phase)) {
        let signature = format!(
            "{}|{}|{}|{}",
            rule.kind,
            rule.layer,
            serde_json::to_string(&rule.match_pattern).unwrap_or_default(),
            rule.regex.clone().unwrap_or_default()
        );
        if !seen.insert(signature) {
            continue;
        }
        if rule.regex.is_some() {
            match compile_raw_rule(rule) {
                Ok(Some(raw)) => out.extend(generate_raw_candidates(asl, ctx, &raw)),
                Ok(None) => {}
                Err(e) => eprintln!("warning: {e}"),
            }
        } else {
            match compile_rule(rule) {
                Ok(Some(seq)) => out.extend(generate_seq_candidates(asl, ctx, &seq)),
                Ok(None) => {}
                Err(e) => eprintln!("warning: {e}"),
            }
        }
    }
    out
}
