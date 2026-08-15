use defuss_semantic_compress::rules::candidate::{
    Candidate, CandidateKind, Phase, SafetyClass, TransformLayer,
};
use defuss_semantic_compress::rules::writer::write;
use defuss_semantic_compress::{parse, Span};

fn removal(span: (usize, usize)) -> Candidate {
    Candidate {
        id: 0,
        rule_id: "test.remove".to_string(),
        phase: Phase::DetFiller,
        priority: 100,
        layer: TransformLayer::Word,
        target_nodes: Vec::new(),
        target_span: Span::new(span.0, span.1),
        kind: CandidateKind::Remove,
        replacement: None,
        safety: SafetyClass::Safe,
        requires_sibling_edit: false,
            allowed_in_protected: false,
    }
}

#[test]
fn writes_from_original_input() {
    let input = "abcdef";
    let asl = parse(input);
    let (out, _) = write(input, &asl, &[removal((0, 3))]);
    assert_eq!(out, "def");
}

#[test]
fn applies_non_overlapping_edits() {
    let input = "aa bb cc dd";
    let asl = parse(input);
    let (out, _) = write(input, &asl, &[removal((0, 2)), removal((6, 8))]);
    // "aa" at line start: eats following space; "cc" mid-line: eats following space
    assert_eq!(out, "bb dd");
}

#[test]
fn repairs_local_whitespace() {
    let input = "fix the bug";
    let asl = parse(input);
    // remove "the" -> duplicate spaces collapsed at the junction
    let (out, _) = write(input, &asl, &[removal((4, 7))]);
    assert_eq!(out, "fix bug");
}

#[test]
fn removes_space_before_punctuation() {
    let input = "fix bug, thanks.";
    let asl = parse(input);
    // remove "thanks" (absorbed comma is the rule's job; here plain removal)
    let (out, _) = write(input, &asl, &[removal((9, 15)), removal((15, 16))]);
    assert_eq!(out, "fix bug,");
    // note: comma absorption is the politeness rule's absorb_leading_symbols;
    // the writer only repairs whitespace
}

#[test]
fn preserves_unchanged_input_exactly() {
    let input = "nothing  to\tdo   here.\n\nkeep  it.\n";
    let asl = parse(input);
    let (out, _) = write(input, &asl, &[]);
    assert_eq!(out, input);
}

#[test]
fn preserves_protected_spans_exactly() {
    let input = "Remove the bug. \"the  stays\" ok";
    let asl = parse(input);
    // remove the first "the" only; the quoted one (with double space) is protected
    let (out, _) = write(input, &asl, &[removal((7, 10))]);
    assert_eq!(out, "Remove bug. \"the  stays\" ok");
}

#[test]
fn prefix_removal_at_line_start_eats_following_space() {
    let input = "Please fix this.";
    let asl = parse(input);
    let (out, _) = write(input, &asl, &[removal((0, 6))]);
    assert_eq!(out, "fix this.");
}

#[test]
fn suffix_removal_at_line_end_eats_preceding_space() {
    let input = "fix this please";
    let asl = parse(input);
    let (out, _) = write(input, &asl, &[removal((9, 15))]);
    assert_eq!(out, "fix this");
}

#[test]
fn trace_records_before_after() {
    let input = "fix the bug";
    let asl = parse(input);
    let (_, trace) = write(input, &asl, &[removal((4, 7))]);
    assert_eq!(trace.len(), 1);
    assert_eq!(trace[0].before, "the");
    assert_eq!(trace[0].after, "");
}
