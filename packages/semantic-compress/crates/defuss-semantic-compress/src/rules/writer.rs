use crate::asl::Asl;
use crate::rules::candidate::{Candidate, CandidateKind};
use crate::span::Span;
use crate::trace::TraceEvent;

/// One concrete text edit derived from a resolved candidate.
#[derive(Debug, Clone)]
pub struct Edit {
    pub span: Span,
    pub replacement: String,
    pub rule_id: String,
    pub phase: String,
    pub kind: CandidateKind,
    pub layer: String,
    pub priority: i32,
    pub target_nodes: Vec<crate::asl::NodeId>,
}

const PUNCT: &[u8] = b",.;:!?";

/// Writes the final output from the ORIGINAL input plus the resolved
/// candidates (§16).
///
/// Whitespace repair (§22) is junction-local and single-pass: when a removal
/// creates a space-space, space-punctuation, line-start-space or
/// space-line-end junction, exactly the whitespace run on one side is
/// dropped. Whitespace not adjacent to an edit is never touched; protected
/// spans and newlines are never crossed.
pub fn write(input: &str, asl: &Asl, accepted: &[Candidate]) -> (String, Vec<TraceEvent>) {
    let mut edits: Vec<Edit> = accepted
        .iter()
        .map(|c| Edit {
            span: c.target_span,
            replacement: c.replacement.clone().unwrap_or_default(),
            rule_id: c.rule_id.clone(),
            phase: c.phase.as_str().to_string(),
            kind: c.kind,
            layer: c.layer.as_str().to_string(),
            priority: c.priority,
            target_nodes: c.target_nodes.clone(),
        })
        .collect();
    edits.sort_by_key(|e| (e.span.start, e.span.end));

    let protected = asl.protected_spans();
    let bytes = input.as_bytes();
    let is_space = |c: Option<u8>| matches!(c, Some(b' ') | Some(b'\t'));

    let mut out = String::with_capacity(input.len());
    let mut trace = Vec::new();
    let mut cursor = 0usize;

    for i in 0..edits.len() {
        let edit = &edits[i];
        if edit.span.start < cursor {
            // defensive: overlaps must have been resolved already
            continue;
        }
        out.push_str(&input[cursor..edit.span.start]);
        let mut end = edit.span.end;

        if edit.kind == CandidateKind::Remove {
            let prev_out = out.as_bytes().last().copied();
            let next_ch = bytes.get(end).copied();
            let next_edit_start = if i + 1 < edits.len() {
                edits[i + 1].span.start
            } else {
                input.len()
            };
            let at_line_start = out.is_empty() || prev_out == Some(b'\n');
            let at_line_end = next_ch.is_none() || next_ch == Some(b'\n');

            if is_space(prev_out) && is_space(next_ch) {
                // duplicate spaces caused by removal: drop the output side
                while is_space(out.as_bytes().last().copied()) {
                    out.pop();
                }
            } else if at_line_start && is_space(next_ch) {
                // prefix deletion at line start: eat following spaces
                while end < next_edit_start
                    && matches!(bytes.get(end), Some(b' ') | Some(b'\t'))
                    && !protected.iter().any(|p| p.contains(end))
                {
                    end += 1;
                }
            } else if at_line_end && is_space(prev_out) {
                // suffix deletion at line end: drop preceding spaces
                while is_space(out.as_bytes().last().copied()) {
                    out.pop();
                }
            } else if is_space(prev_out)
                && next_ch.map(|c| PUNCT.contains(&c)).unwrap_or(false)
            {
                // space before punctuation caused by removal
                while is_space(out.as_bytes().last().copied()) {
                    out.pop();
                }
            }
        }

        out.push_str(&edit.replacement);
        trace.push(TraceEvent {
            rule_id: edit.rule_id.clone(),
            phase: edit.phase.clone(),
            kind: edit.kind.as_str().to_string(),
            layer: edit.layer.clone(),
            before: input[edit.span.start..end].to_string(),
            after: edit.replacement.clone(),
            span: Span::new(edit.span.start, end),
            node_ids: edit.target_nodes.clone(),
            priority: edit.priority,
        });
        cursor = end;
    }
    out.push_str(&input[cursor..]);
    (out, trace)
}
