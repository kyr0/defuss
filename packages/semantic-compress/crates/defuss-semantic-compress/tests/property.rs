use defuss_semantic_compress::{compress, parse, parse_with, render, CompressConfig, Compressor, ParseStrategy, ParserMode};
use proptest::prelude::*;

fn fragment_strategy() -> impl Strategy<Value = String> {
    prop::sample::select(vec![
        "the".to_string(),
        "a".to_string(),
        "this".to_string(),
        "that".to_string(),
        "basically".to_string(),
        "just".to_string(),
        "Please".to_string(),
        "could you".to_string(),
        "fix".to_string(),
        "bug".to_string(),
        "now".to_string(),
        "I would".to_string(),
        "I'd".to_string(),
        "not".to_string(),
        "\"quoted the\"".to_string(),
        "`code the`".to_string(),
        "| x | y |".to_string(),
        "| --- | --- |".to_string(),
        "```json".to_string(),
        "{\"a\": 1}".to_string(),
        "```".to_string(),
        "```ts".to_string(),
        "const the = 1;".to_string(),
        "> quote the".to_string(),
        "# heading the".to_string(),
        "- item the".to_string(),
        "ümläut".to_string(),
        "👀".to_string(),
        "thanks".to_string(),
        "/Users/aron".to_string(),
        "foo".to_string(),
        ".".to_string(),
        ",".to_string(),
        " ".to_string(),
        "  ".to_string(),
        "\n".to_string(),
        "\n\n\n".to_string(),
    ])
}

fn input_strategy() -> impl Strategy<Value = String> {
    prop::collection::vec(fragment_strategy(), 1..24).prop_map(|parts| parts.join(""))
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(256))]

    #[test]
    fn prop_parse_render_identity(s in input_strategy()) {
        prop_assert_eq!(render(&parse(&s)), s);
    }

    #[test]
    fn prop_compress_valid_utf8_and_not_longer(s in input_strategy()) {
        let out = compress(&s, CompressConfig { lang: Some("en".to_string()), ..Default::default() }).unwrap();
        prop_assert!(std::str::from_utf8(out.output.as_bytes()).is_ok());
        prop_assert!(out.output.len() <= s.len(), "output grew: {:?} -> {:?}", s, out.output);
    }

    #[test]
    fn prop_compress_idempotent(s in input_strategy()) {
        let cfg = CompressConfig { lang: Some("en".to_string()), ..Default::default() };
        let once = compress(&s, cfg.clone()).unwrap().output;
        let twice = compress(&once, cfg).unwrap().output;
        prop_assert_eq!(once, twice);
    }

    #[test]
    fn prop_trace_node_ids_exist(s in input_strategy()) {
        let cfg = CompressConfig {
            lang: Some("en".to_string()),
            emit_trace: true,
            ..Default::default()
        };
        let out = compress(&s, cfg).unwrap();
        let asl = out.asl_debug.clone().unwrap();
        for t in &out.trace {
            for nid in &t.node_ids {
                prop_assert!((*nid as usize) < asl.nodes.len());
            }
            prop_assert!(t.span.start <= t.span.end);
            prop_assert!(t.span.end <= s.len());
        }
    }

    #[test]
    fn prop_resolved_candidates_do_not_overlap(s in input_strategy()) {
        let compressor = Compressor::new(Some("en"), None).unwrap();
        let cfg = CompressConfig { lang: Some("en".to_string()), ..Default::default() };
        let analysis = compressor.analyze(&s, &cfg).unwrap();
        for (i, a) in analysis.accepted.iter().enumerate() {
            for b in analysis.accepted.iter().skip(i + 1) {
                prop_assert!(!a.target_span.overlaps(&b.target_span));
            }
        }
    }

    #[test]
    fn prop_protected_spans_untouched(s in input_strategy()) {
        let compressor = Compressor::new(Some("en"), None).unwrap();
        let cfg = CompressConfig { lang: Some("en".to_string()), ..Default::default() };
        let analysis = compressor.analyze(&s, &cfg).unwrap();
        let protected = analysis.asl.protected_spans();
        for cand in &analysis.accepted {
            if cand.allowed_in_protected {
                continue;
            }
            for p in &protected {
                prop_assert!(!cand.target_span.overlaps(p),
                    "candidate {} touches protected span {:?}", cand.rule_id, p);
            }
        }
    }

    #[test]
    fn prop_candidate_spans_valid(s in input_strategy()) {
        let compressor = Compressor::new(Some("en"), None).unwrap();
        let cfg = CompressConfig { lang: Some("en".to_string()), ..Default::default() };
        let analysis = compressor.analyze(&s, &cfg).unwrap();
        for c in &analysis.candidates {
            prop_assert!(c.target_span.start <= c.target_span.end);
            prop_assert!(c.target_span.end <= s.len());
            // span boundaries must be char boundaries
            prop_assert!(s.is_char_boundary(c.target_span.start));
            prop_assert!(s.is_char_boundary(c.target_span.end));
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(128))]

    #[test]
    fn prop_output_satisfies_min_output_ratio(s in input_strategy()) {
        // §26.5: output satisfies min_output_ratio (or safely falls back)
        let cfg = CompressConfig { lang: Some("en".to_string()), ..Default::default() };
        let out = compress(&s, cfg).unwrap();
        if !s.is_empty() {
            prop_assert!(
                (out.output.len() as f32) >= 0.1 * s.len() as f32 || out.output == s,
                "budget violated without fallback: {:?} -> {:?}", s, out.output
            );
        }
    }

    #[test]
    fn prop_parent_pointers_consistent_after_parse(s in input_strategy()) {
        // §26.5: parent pointers are consistent after parse
        let asl = parse(&s);
        prop_assert!(asl.parent_pointers_consistent());
    }

    #[test]
    fn prop_parser_fallback_produces_protected_unknown(s in "\\`\\`\\`json\\n\\{[a-z0-9 ,}:]{0,20}") {
        // §26.5: unclosed fence -> protected Unknown region, never a panic
        let asl = parse_with(&s, ParseStrategy::BestEffort, ParserMode::FullProtection).unwrap();
        if s.contains("```json\n{") {
            prop_assert!(asl.nodes.iter().any(|n| n.kind == defuss_semantic_compress::NodeKind::Unknown && n.meta.protected));
        }
        prop_assert_eq!(render(&asl), s);
    }
}
