//! v2 feature unit tests (plans/semantic-compress-updated.md):
//! parent pointers, parser modes, parse fallback, normalization cache,
//! confidence filter, budget guard, interval index, WritePlan.

use defuss_semantic_compress::rules::candidate::{
    Candidate, CandidateKind, Phase, SafetyClass, TransformLayer,
};
use defuss_semantic_compress::rules::resolver::SpanIndex;
use defuss_semantic_compress::rules::writer::{plan, write};
use defuss_semantic_compress::{
    compress, compress_chunked, parse, parse_with, CompressConfig, NodeKind, ParseStrategy,
    ParserMode, Span,
};

fn cand(rule_id: &str, priority: i32, span: (usize, usize)) -> Candidate {
    Candidate {
        id: 0,
        rule_id: rule_id.to_string(),
        phase: Phase::DetFiller,
        priority,
        layer: TransformLayer::Word,
        confidence: 1.0,
        target_nodes: Vec::new(),
        target_span: Span::new(span.0, span.1),
        kind: CandidateKind::Remove,
        replacement: None,
        safety: SafetyClass::Safe,
        requires_sibling_edit: false,
        allowed_in_protected: false,
        review_on_low_confidence: true,
    }
}

// --- §26.1 parent pointer integrity -------------------------------------

#[test]
fn parent_pointers_consistent() {
    for input in [
        "Please fix this.",
        "# Title\n\n- a\n- b\n\n```json\n{}\n```\n",
        "He said \"the bug\" loudly.\n\n| a | b |\n| --- | --- |\n",
    ] {
        let asl = parse(input);
        assert!(asl.parent_pointers_consistent(), "bad parents for {input:?}");
        // spot check: every non-root node has a parent
        assert!(asl.nodes.iter().skip(1).all(|n| n.parent.is_some()));
    }
}

// --- §26.1 parser fallback mode ------------------------------------------

#[test]
fn parse_unclosed_code_fence_best_effort() {
    let asl = parse_with("```json\n{unterminated", ParseStrategy::BestEffort, ParserMode::FullProtection).unwrap();
    // Unknown node covering the unterminated region, protected
    assert!(asl
        .nodes
        .iter()
        .any(|n| n.kind == NodeKind::Unknown && n.meta.protected));
    // lossless
    assert_eq!(defuss_semantic_compress::render(&asl), "```json\n{unterminated");
}

#[test]
fn parse_unclosed_code_fence_strict_errors() {
    let result = parse_with("```json\n{unterminated", ParseStrategy::Strict, ParserMode::FullProtection);
    assert!(result.is_err());
    let err = result.err().unwrap().to_string();
    assert!(err.contains("unclosed code fence"), "unexpected: {err}");
}

#[test]
fn unclosed_fence_passes_through_unchanged() {
    let input = "```json\n{unterminated\n";
    let out = compress(input, CompressConfig::default()).unwrap();
    assert_eq!(out.output, input);
}

#[test]
fn strict_mode_unmatched_quote_errors() {
    let result = parse_with("a \" stray", ParseStrategy::Strict, ParserMode::FullProtection);
    assert!(result.is_err());
}

// --- §5.2 / §26.1 parser protection modes ---------------------------------

#[test]
fn protection_modes_full_vs_minimal() {
    let input = "```sh\ncd /Users/aron/code\n```\n";
    // FullProtection (default): path rule must not fire inside the fence
    let full = compress(input, CompressConfig::default()).unwrap();
    assert_eq!(full.output, input);
    // MinimalProtection: fences unprotected, path rule fires
    let min = compress(
        input,
        CompressConfig {
            parser_mode: ParserMode::MinimalProtection,
            ..Default::default()
        },
    )
    .unwrap();
    assert!(min.output.contains("~/code"), "unexpected: {:?}", min.output);
}

#[test]
fn protection_mode_partial_allows_markdown_prose() {
    let input = "```markdown\nPlease fix the bug.\n```\n";
    let partial = compress(
        input,
        CompressConfig {
            parser_mode: ParserMode::PartialProtection,
            ..Default::default()
        },
    )
    .unwrap();
    assert!(partial.output.contains("fix bug"), "unexpected: {:?}", partial.output);
}

// --- §16.1 / §26.1 normalization cache ------------------------------------

#[test]
fn normalization_cache_hits() {
    let rules = defuss_semantic_compress::rules::loader::load_rules(Some("en"), None, &[]).unwrap();
    let mut cache = defuss_semantic_compress::classify::normalize::NormalizationCache::new(&rules.alias_map);
    let a = cache.get("the", "en");
    let b = cache.get("the", "en");
    assert_eq!(a, b);
    let (hits, misses) = cache.stats();
    assert_eq!(misses, 1);
    assert_eq!(hits, 1);
    // alias lookup: "I'd" normalizes to "i_would"
    let id = cache.get("I'd", "en");
    assert_eq!(id.normalized.as_deref(), Some("i_would"));
}

// --- §13.7 / §26.1 interval tree ------------------------------------------

#[test]
fn interval_tree_finds_all_overlapping() {
    let mut idx = SpanIndex::new();
    idx.insert(Span::new(0, 5));
    idx.insert(Span::new(10, 20));
    idx.insert(Span::new(30, 40));
    assert_eq!(idx.find_overlapping(Span::new(3, 4)).len(), 1);
    assert_eq!(idx.find_overlapping(Span::new(4, 12)).len(), 2);
    assert_eq!(idx.find_overlapping(Span::new(20, 30)).len(), 0);
    assert_eq!(idx.find_overlapping(Span::new(50, 60)).len(), 0);
    // build API (§13.7)
    let idx2 = SpanIndex::build(&[(0, 5, 0), (10, 20, 1)]);
    assert_eq!(idx2.find_overlapping(Span::new(15, 16)).len(), 1);
}

// --- §15.1.3 / §26.1 confidence filter ------------------------------------

#[test]
fn confidence_filter_downgrades_low_confidence() {
    // det/filler rules carry confidence 0.85; a 0.9 threshold downgrades them
    let input = "fix the bug";
    let strict = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            min_confidence: 0.9,
            emit_trace: true,
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(strict.output, "fix the bug");
    // the Review candidate is visible in the trace
    assert!(strict
        .trace
        .iter()
        .any(|t| t.kind == "Review" && t.rule_id == "en.det.remove"));

    // default threshold applies them
    let normal = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(normal.output, "fix bug");
}

#[test]
fn review_candidates_never_block_resolution() {
    // a Review candidate overlapping a real one must not reject it
    let input = "I am here.";
    let out = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            min_confidence: 0.99, // contractions (0.95) -> Review
            emit_trace: true,
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(out.output, "I am here."); // contraction reviewed, not applied
    assert!(out.trace.iter().any(|t| t.kind == "Review" && t.rule_id == "en.contract.i_am"));
}

// --- §13.8 / §26.1 compression budget -------------------------------------

#[test]
fn compression_budget_downgrade_works() {
    let input = "Please, could you basically fix the bug in this project now, thanks.";
    // tiny budget: output must stay >= 90% of input -> nearly nothing removed
    let out = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            min_output_ratio: 0.9,
            ..Default::default()
        },
    )
    .unwrap();
    let ratio = out.output.len() as f32 / input.len() as f32;
    assert!(
        ratio >= 0.9 || out.metrics.safety_violations > 0,
        "budget violated: {:?} -> {:?}",
        input,
        out.output
    );
    // default budget compresses fully
    let full = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(full.output, "fix bug in project now");
}

#[test]
fn max_removal_tokens_cap() {
    let input = "Please, could you fix the bug now.";
    let cfg = || CompressConfig {
        lang: Some("en".to_string()),
        ..Default::default()
    };

    // uncapped: politeness phrase + det + period all removed
    let uncapped = compress(input, cfg()).unwrap();
    assert_eq!(uncapped.output, "fix bug now");

    // cap 5: the worst-ranked candidate (final period) is downgraded first,
    // politeness (4 tokens) + det (1 token) still fit the cap
    let capped = compress(
        input,
        CompressConfig {
            max_removal_tokens: Some(5),
            ..cfg()
        },
    )
    .unwrap();
    assert_eq!(capped.output, "fix bug now.");

    // cap 2: even the phrase alone exceeds the cap, so candidates are
    // downgraded worst-first until nothing is applied
    let tight = compress(
        input,
        CompressConfig {
            max_removal_tokens: Some(2),
            ..cfg()
        },
    )
    .unwrap();
    assert_eq!(tight.output, input);
}

// --- §14.1 WritePlan -------------------------------------------------------

#[test]
fn writeplan_assembles_from_passthroughs_and_insertions() {
    let input = "Please fix the bug.";
    let asl = parse(input);
    let cands = vec![cand("test.please", 500, (0, 6)), cand("test.the", 200, (11, 14))];
    let (plan, _) = plan(input, &asl, &cands);
    assert_eq!(plan.passthroughs.len(), plan.insertions.len() + 1);
    assert_eq!(plan.assemble(input), "fix bug.");
    // same result through the compat write()
    let (out, _) = write(input, &asl, &cands);
    assert_eq!(out, "fix bug.");
    // output_len without assembling
    assert_eq!(plan.output_len(), "fix bug.".len());
}

#[test]
fn writeplan_empty_for_no_edits() {
    let input = "untouched.";
    let asl = parse(input);
    let (plan, trace) = plan(input, &asl, &[]);
    assert!(trace.is_empty());
    assert_eq!(plan.assemble(input), input);
}

// --- §19.2 no-op detection / §19.4 result flags ----------------------------

#[test]
fn no_candidates_detection() {
    let input = "Everything here stays.";
    let out = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            emit_trace: true,
            ..Default::default()
        },
    )
    .unwrap();
    assert!(out.no_candidates_applied);
    assert!(out.idempotent);
    assert!(out.trace.iter().any(|t| t.rule_id == "shared.no_candidates"));
}

// --- §25 chunked processing -------------------------------------------------

#[test]
fn chunked_matches_unchunked() {
    let input = "Please fix the bug now.\n\nCould you check the code please.\n\n```json\n{\n  \"a\": 1\n}\n```\n";
    let whole = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            ..Default::default()
        },
    )
    .unwrap();
    let chunked = compress_chunked(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(chunked.output, whole.output);
}

#[test]
fn chunked_never_splits_fences() {
    let input = "```json\n{\n\n  \"a\": 1\n\n}\n```\n";
    let out = compress_chunked(input, CompressConfig::default()).unwrap();
    assert_eq!(out.output, "```json\n{\"a\":1}\n```\n");
}

#[test]
fn chunked_long_document() {
    let para = "Please, could you fix the bug in this function now.\n\n";
    let input = para.repeat(50);
    let whole = compress(&input, CompressConfig::default()).unwrap();
    let chunked = compress_chunked(&input, CompressConfig::default()).unwrap();
    assert_eq!(whole.output, chunked.output);
    assert!(chunked.metrics.sections.len() >= 50);
}
