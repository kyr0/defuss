use crate::asl::Asl;
use crate::rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};

use super::codefence_json::fence_bodies;

/// Conservative CSS minification (§21.4): strips comments, collapses
/// whitespace runs, removes whitespace around structural punctuation.
/// String literals are never touched. Hand-rolled, so it works identically
/// on native and WASM targets.
pub fn generate(asl: &Asl, input: &str, enabled: bool) -> Vec<Candidate> {
    if !enabled {
        return Vec::new();
    }
    fence_bodies(asl, input, "css")
        .into_iter()
        .filter_map(|(span, body)| {
            let mut min = minify_css(&body);
            if body.ends_with('\n') && !min.ends_with('\n') {
                min.push('\n');
            }
            if min == body || min.len() >= body.len() {
                return None;
            }
            Some(Candidate {
                id: 0,
                rule_id: "shared.codefence.css.minify".to_string(),
                phase: Phase::CodefenceFormat,
                priority: 150,
                layer: TransformLayer::Block,
                target_nodes: Vec::new(),
                target_span: span,
                kind: CandidateKind::CompactStructuredFormat,
                replacement: Some(min),
                safety: SafetyClass::Safe,
                requires_sibling_edit: false,
            allowed_in_protected: true,
            })
        })
        .collect()
}

fn minify_css(css: &str) -> String {
    let chars: Vec<char> = css.chars().collect();
    let mut out = String::with_capacity(css.len());
    let mut i = 0;
    let mut in_string: Option<char> = None;
    let mut pending_ws = false;
    while i < chars.len() {
        let c = chars[i];
        if let Some(q) = in_string {
            out.push(c);
            if c == '\\' && i + 1 < chars.len() {
                out.push(chars[i + 1]);
                i += 2;
                continue;
            }
            if c == q {
                in_string = None;
            }
            i += 1;
            continue;
        }
        // comments
        if c == '/' && chars.get(i + 1) == Some(&'*') {
            let mut j = i + 2;
            while j + 1 < chars.len() && !(chars[j] == '*' && chars[j + 1] == '/') {
                j += 1;
            }
            i = (j + 2).min(chars.len());
            continue;
        }
        if c == '"' || c == '\'' {
            if pending_ws && !out.is_empty() && !structural(out.chars().last()) {
                out.push(' ');
            }
            pending_ws = false;
            in_string = Some(c);
            out.push(c);
            i += 1;
            continue;
        }
        if c.is_whitespace() {
            pending_ws = true;
            i += 1;
            continue;
        }
        if structural(Some(c)) {
            // no whitespace around structural punctuation; ";" before "}"
            // is redundant
            if c == '}' && out.ends_with(';') {
                out.pop();
            }
            if out.ends_with(' ') {
                out.pop();
            }
            out.push(c);
            pending_ws = false;
            i += 1;
            continue;
        }
        if pending_ws && !out.is_empty() && !structural(out.chars().last()) {
            out.push(' ');
        }
        pending_ws = false;
        out.push(c);
        i += 1;
    }
    out.trim().to_string()
}

fn structural(c: Option<char>) -> bool {
    matches!(c, Some('{') | Some('}') | Some(':') | Some(';') | Some(',') | Some('>') | Some('+') | Some('~'))
}
