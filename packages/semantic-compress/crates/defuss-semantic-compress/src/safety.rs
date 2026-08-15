use crate::asl::Asl;
use crate::rules::candidate::Candidate;

/// Global final checks (§23). Returns a list of violations; empty means safe.
///
/// - output must not be longer than input (safe mode never grows text)
/// - no resolved candidate may intersect a protected span
/// - output must be valid UTF-8 (guaranteed by `String`, asserted anyway)
///
/// Idempotence is checked separately by the pipeline (it needs a second
/// compress pass).
pub fn check_output(input: &str, output: &str, asl: &Asl, accepted: &[Candidate]) -> Vec<String> {
    let mut violations = Vec::new();
    if output.len() > input.len() {
        violations.push(format!(
            "output grew: {} -> {} bytes",
            input.len(),
            output.len()
        ));
    }
    if std::str::from_utf8(output.as_bytes()).is_err() {
        violations.push("output is not valid UTF-8".to_string());
    }
    let protected = asl.protected_spans();
    for cand in accepted {
        if cand.allowed_in_protected {
            // programmatic code-fence format candidates (§8.1 exceptions)
            continue;
        }
        if protected.iter().any(|p| p.overlaps(&cand.target_span)) {
            violations.push(format!(
                "candidate {} intersects protected span {:?}",
                cand.rule_id, cand.target_span
            ));
        }
    }
    violations
}
