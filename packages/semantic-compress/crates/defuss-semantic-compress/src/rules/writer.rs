use crate::asl::Asl;
use crate::metrics::SectionMetrics;
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

/// A plan for writing output from the original input (§14.1): passthrough
/// ranges of the original plus insertions between them. Enables dry-run,
/// efficient building and exact per-section metrics.
///
/// Invariant: `passthroughs.len() == insertions.len() + 1` (insertion[i]
/// replaces the original text between passthrough[i] and passthrough[i+1]).
#[derive(Debug, Clone, Default)]
pub struct WritePlan {
    pub passthroughs: Vec<Span>,
    pub insertions: Vec<String>,
    /// Sections where nothing changed (for metrics).
    pub unchanged_sections: Vec<SectionMetrics>,
}

impl WritePlan {
    /// Assemble the final output string from the plan.
    pub fn assemble(&self, input: &str) -> String {
        let mut out = String::with_capacity(
            self.passthroughs.iter().map(|s| s.len()).sum::<usize>()
                + self.insertions.iter().map(|s| s.len()).sum::<usize>(),
        );
        for (i, passthrough) in self.passthroughs.iter().enumerate() {
            if i > 0 {
                out.push_str(&self.insertions[i - 1]);
            }
            out.push_str(&input[passthrough.start..passthrough.end]);
        }
        out
    }

    /// Total output byte length without assembling.
    pub fn output_len(&self) -> usize {
        self.passthroughs.iter().map(|s| s.len()).sum::<usize>()
            + self.insertions.iter().map(|s| s.len()).sum::<usize>()
    }
}

const PUNCT: &[u8] = b",.;:!?";

/// Builds a WritePlan from the ORIGINAL input plus the resolved candidates
/// (§16, §14.2).
///
/// Whitespace repair (§22/§14.3) is junction-local and happens while
/// planning: when a removal creates a space-space, space-punctuation,
/// line-start-space or space-line-end junction, the whitespace run on one
/// side is folded into the edit (shortening the passthrough or extending
/// the edit). Whitespace not adjacent to an edit is never touched;
/// protected spans and newlines are never crossed.
pub fn plan(input: &str, asl: &Asl, accepted: &[Candidate]) -> (WritePlan, Vec<TraceEvent>) {
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

    let mut passthroughs: Vec<Span> = Vec::new();
    let mut insertions: Vec<String> = Vec::new();
    let mut trace = Vec::new();
    let mut cursor = 0usize;
    // last byte written to the output so far (of passthrough or insertion)
    let mut last_out: Option<u8> = None;
    // whether anything non-empty has been emitted so far
    let mut wrote_anything = false;

    for i in 0..edits.len() {
        let edit = &edits[i];
        if edit.span.start < cursor {
            // defensive: overlaps must have been resolved already
            continue;
        }
        // current passthrough end (may shrink during junction repair)
        let mut pass_end = edit.span.start;
        let mut end = edit.span.end;

        if edit.kind == CandidateKind::Remove {
            let prev_out = if pass_end > cursor {
                bytes.get(pass_end - 1).copied()
            } else if wrote_anything {
                last_out
            } else {
                // nothing in the output yet — behave like document start
                None
            };
            let next_ch = bytes.get(end).copied();
            let next_edit_start = if i + 1 < edits.len() {
                edits[i + 1].span.start
            } else {
                input.len()
            };
            let at_line_start = !wrote_anything || prev_out == Some(b'\n');
            let at_line_end = next_ch.is_none() || next_ch == Some(b'\n');

            if is_space(prev_out) && is_space(next_ch) {
                // duplicate spaces caused by removal: drop the output side
                while pass_end > cursor && is_space(bytes.get(pass_end - 1).copied()) {
                    pass_end -= 1;
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
                while pass_end > cursor && is_space(bytes.get(pass_end - 1).copied()) {
                    pass_end -= 1;
                }
            } else if is_space(prev_out)
                && next_ch.map(|c| PUNCT.contains(&c)).unwrap_or(false)
            {
                // space before punctuation caused by removal
                while pass_end > cursor && is_space(bytes.get(pass_end - 1).copied()) {
                    pass_end -= 1;
                }
            }
        }

        passthroughs.push(Span::new(cursor, pass_end));
        insertions.push(edit.replacement.clone());
        if pass_end > cursor || !edit.replacement.is_empty() {
            wrote_anything = true;
        }
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
        last_out = if edit.replacement.is_empty() {
            if pass_end > 0 {
                bytes.get(pass_end - 1).copied()
            } else {
                None
            }
        } else {
            edit.replacement.as_bytes().last().copied()
        };
    }
    passthroughs.push(Span::new(cursor, input.len()));

    (
        WritePlan {
            passthroughs,
            insertions,
            unchanged_sections: Vec::new(),
        },
        trace,
    )
}

/// Convenience: plan + assemble (§14.2).
pub fn write(input: &str, asl: &Asl, accepted: &[Candidate]) -> (String, Vec<TraceEvent>) {
    let (plan, trace) = plan(input, asl, accepted);
    (plan.assemble(input), trace)
}
