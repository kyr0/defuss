use defuss_semantic_compress::rules::candidate::{
    Candidate, CandidateKind, Phase, SafetyClass, TransformLayer,
};
use defuss_semantic_compress::rules::resolver::resolve;
use defuss_semantic_compress::rules::writer::write;
use defuss_semantic_compress::{parse, Span};

fn cand(
    rule_id: &str,
    kind: CandidateKind,
    layer: TransformLayer,
    priority: i32,
    span: (usize, usize),
    replacement: Option<&str>,
) -> Candidate {
    Candidate {
        id: 0,
        rule_id: rule_id.to_string(),
        phase: Phase::Contractions,
        priority,
        layer,
        target_nodes: Vec::new(),
        target_span: Span::new(span.0, span.1),
        kind,
        replacement: replacement.map(|s| s.to_string()),
        safety: SafetyClass::Safe,
        requires_sibling_edit: false,
            allowed_in_protected: false,
            confidence: 1.0,
            review_on_low_confidence: true,
    }
}

#[test]
fn removal_beats_replacement() {
    // §14/§15.1/§31 milestone 3 critical test:
    // "I would like you to build this." with
    //   I would -> I'd (Replace, Word, 100, [0..7))
    //   I would like you to -> "" (Remove, Phrase, 500, [0..19))
    // output must be "build this." (removal wins)
    let input = "I would like you to build this.";
    let asl = parse(input);
    let contraction = cand(
        "en.contract.i_would",
        CandidateKind::Replace,
        TransformLayer::Word,
        100,
        (0, 7),
        Some("I'd"),
    );
    let removal = cand(
        "en.polite.i_would_like_you_to",
        CandidateKind::Remove,
        TransformLayer::Phrase,
        500,
        (0, 19),
        None,
    );
    let (accepted, rejected) = resolve(&asl, vec![contraction, removal]);
    assert_eq!(accepted.len(), 1);
    assert_eq!(accepted[0].rule_id, "en.polite.i_would_like_you_to");
    assert_eq!(rejected.len(), 1);
    assert_eq!(rejected[0].rule_id, "en.contract.i_would");
    assert_eq!(
        rejected[0].reason, "overlapped_by_higher_priority_removal",
        "unexpected reason: {}",
        rejected[0].reason
    );
    let (out, _) = write(input, &asl, &accepted);
    assert_eq!(out, "build this.");
}

#[test]
fn phrase_beats_word() {
    // §15.2: layer order Line > Block > Phrase > Word > Symbol > Whitespace
    let input = "abcdef ghijk";
    let asl = parse(input);
    let phrase = cand("p", CandidateKind::Remove, TransformLayer::Phrase, 100, (0, 6), None);
    let word = cand("w", CandidateKind::Remove, TransformLayer::Word, 100, (3, 9), None);
    let (accepted, _) = resolve(&asl, vec![word, phrase]);
    assert_eq!(accepted.len(), 1);
    assert_eq!(accepted[0].rule_id, "p");
}

#[test]
fn higher_priority_beats_lower() {
    let input = "abcdef";
    let asl = parse(input);
    let low = cand("low", CandidateKind::Remove, TransformLayer::Word, 100, (0, 3), None);
    let high = cand("high", CandidateKind::Remove, TransformLayer::Word, 200, (0, 3), None);
    let (accepted, rejected) = resolve(&asl, vec![low, high]);
    assert_eq!(accepted[0].rule_id, "high");
    assert_eq!(rejected[0].rule_id, "low");
}

#[test]
fn longer_span_beats_shorter() {
    let input = "abcdef";
    let asl = parse(input);
    let short = cand("short", CandidateKind::Remove, TransformLayer::Word, 100, (0, 2), None);
    let long = cand("long", CandidateKind::Remove, TransformLayer::Word, 100, (0, 4), None);
    let (accepted, _) = resolve(&asl, vec![short, long]);
    assert_eq!(accepted[0].rule_id, "long");
}

#[test]
fn shorter_utf8_replacement_wins_word_collisions() {
    // §15.5: among colliding word-level replacements, fewer UTF-8 bytes wins
    let input = "abcdef";
    let asl = parse(input);
    let a = cand("a", CandidateKind::Replace, TransformLayer::Word, 100, (0, 3), Some("xx"));
    let b = cand("b", CandidateKind::Replace, TransformLayer::Word, 100, (0, 3), Some("x"));
    let (accepted, _) = resolve(&asl, vec![a, b]);
    assert_eq!(accepted[0].rule_id, "b");
}

#[test]
fn lexicographically_smaller_replacement_wins() {
    let input = "abcdef";
    let asl = parse(input);
    let a = cand("a", CandidateKind::Replace, TransformLayer::Word, 100, (0, 3), Some("yy"));
    let b = cand("b", CandidateKind::Replace, TransformLayer::Word, 100, (0, 3), Some("aa"));
    let (accepted, _) = resolve(&asl, vec![a, b]);
    assert_eq!(accepted[0].rule_id, "b");
}

#[test]
fn deterministic_rule_id_tiebreak() {
    let input = "abcdef";
    let asl = parse(input);
    let a = cand("z.rule", CandidateKind::Replace, TransformLayer::Word, 100, (0, 3), Some("x"));
    let b = cand("a.rule", CandidateKind::Replace, TransformLayer::Word, 100, (0, 3), Some("x"));
    let (accepted, _) = resolve(&asl, vec![a.clone(), b.clone()]);
    assert_eq!(accepted[0].rule_id, "a.rule");
    // deterministic regardless of input order
    let (accepted2, _) = resolve(&asl, vec![b, a]);
    assert_eq!(accepted2[0].rule_id, "a.rule");
}

#[test]
fn resolved_candidates_do_not_overlap() {
    let input = "Please, could you fix the bug now.";
    let asl = parse(input);
    let cands = vec![
        cand("p1", CandidateKind::Remove, TransformLayer::Phrase, 500, (0, 7), None),
        cand("p2", CandidateKind::Remove, TransformLayer::Phrase, 500, (8, 17), None),
        cand("d1", CandidateKind::Remove, TransformLayer::Word, 200, (22, 25), None),
        cand("dot", CandidateKind::Remove, TransformLayer::Symbol, 100, (33, 34), None),
    ];
    let (accepted, _) = resolve(&asl, cands);
    for (i, a) in accepted.iter().enumerate() {
        for b in accepted.iter().skip(i + 1) {
            assert!(!a.target_span.overlaps(&b.target_span));
        }
    }
}
