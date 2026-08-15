use defuss_semantic_compress::rules::loader::load_rules;
use defuss_semantic_compress::rules::matcher::{
    compile_rule, generate_seq_candidates, MatchContext,
};
use defuss_semantic_compress::rules::schema::RuleJson;
use defuss_semantic_compress::{classify, parse};
use std::collections::BTreeMap;

fn ctx_for<'a>(
    input: &'a str,
    alias_map: &'a BTreeMap<String, String>,
    action_words: Vec<String>,
) -> MatchContext<'a> {
    MatchContext::new(input, alias_map, action_words)
}

fn empty_alias() -> BTreeMap<String, String> {
    BTreeMap::new()
}

fn rule(json: &str) -> RuleJson {
    serde_json::from_str(json).unwrap()
}

fn classify_en(input: &str) -> (defuss_semantic_compress::Asl, defuss_semantic_compress::RuleSet) {
    let rules = load_rules(Some("en"), None, &[]).unwrap();
    let mut asl = parse(input);
    classify::classify(&mut asl, &rules);
    (asl, rules)
}

#[test]
fn matches_word_sequence() {
    let (asl, rules) = classify_en("Could you fix the bug please.");
    let r = rules.packs[0]
        .rules
        .iter()
        .find(|r| r.id == "en.polite.could_you")
        .unwrap();
    let compiled = compile_rule(r).unwrap().unwrap();
    let alias = empty_alias();
    let ctx = ctx_for("Could you fix the bug please.", &alias, rules.packs[0].action_words.clone());
    let cands = generate_seq_candidates(&asl, &ctx, &compiled);
    assert_eq!(cands.len(), 1);
    assert_eq!(
        &"Could you fix the bug please."[cands[0].target_span.start..cands[0].target_span.end],
        "Could you"
    );
}

#[test]
fn matches_regex_sequence() {
    let (asl, _rules) = classify_en("I would go.");
    let r = rule(
        r#"{
        "id": "t.contract", "phase": "contractions", "kind": "Replace", "layer": "Word",
        "priority": 100,
        "match": [{"regex": "^[Ii]$"}, {"whitespace": true}, {"regex": "^would$"}],
        "replacement": "I'd",
        "guards": {"requires_utf8_saving": true}
    }"#,
    );
    let compiled = compile_rule(&r).unwrap().unwrap();
    let alias = empty_alias();
    let ctx = ctx_for("I would go.", &alias, vec![]);
    let cands = generate_seq_candidates(&asl, &ctx, &compiled);
    assert_eq!(cands.len(), 1);
    assert_eq!(cands[0].replacement.as_deref(), Some("I'd"));
}

#[test]
fn matches_normalized_forms() {
    // "I'd" and "I would" both match {normalized: "i_would"} (§19)
    let rules = load_rules(Some("en"), None, &[]).unwrap();
    let r = rules.packs[0]
        .rules
        .iter()
        .find(|r| r.id == "en.polite.i_would_like_you_to")
        .unwrap();
    let compiled = compile_rule(r).unwrap().unwrap();

    for input in ["I'd like you to build this.", "I would like you to build this."] {
        let mut asl = parse(input);
        classify::classify(&mut asl, &rules);
        let ctx = MatchContext::new(input, &rules.alias_map, rules.packs[0].action_words.clone());
        let cands = generate_seq_candidates(&asl, &ctx, &compiled);
        assert_eq!(cands.len(), 1, "no match for {input:?}");
        let span = cands[0].target_span;
        let matched = &input[span.start..span.end];
        assert!(
            matched == "I'd like you to" || matched == "I would like you to",
            "unexpected match {matched:?}"
        );
    }
}

#[test]
fn matches_optional_token() {
    let (asl, rules) = classify_en("Please could you fix it.");
    let r = rules.packs[0]
        .rules
        .iter()
        .find(|r| r.id == "en.polite.please_could_you")
        .unwrap();
    let compiled = compile_rule(r).unwrap().unwrap();
    let ctx = MatchContext::new(
        "Please could you fix it.",
        &rules.alias_map,
        rules.packs[0].action_words.clone(),
    );
    let cands = generate_seq_candidates(&asl, &ctx, &compiled);
    // optional comma absent -> still matches "Please could you"
    assert_eq!(cands.len(), 1);
    let span = cands[0].target_span;
    assert_eq!(&"Please could you fix it."[span.start..span.end], "Please could you");
}

#[test]
fn does_not_match_across_quote_boundary() {
    // "the" inside quotes is never classified, so no Det match exists there
    let (asl, rules) = classify_en("Say \"the word\" out loud.");
    let r = rules.packs[0]
        .rules
        .iter()
        .find(|r| r.id == "en.det.remove")
        .unwrap();
    let compiled = compile_rule(r).unwrap().unwrap();
    let ctx = MatchContext::new("Say \"the word\" out loud.", &rules.alias_map, vec![]);
    let cands = generate_seq_candidates(&asl, &ctx, &compiled);
    assert!(cands.is_empty());
}

#[test]
fn does_not_match_across_protected_code_fence() {
    let input = "```ts\nconst the = \"that\";\n```\n";
    let (asl, rules) = classify_en(input);
    let r = rules.packs[0]
        .rules
        .iter()
        .find(|r| r.id == "en.det.remove")
        .unwrap();
    let compiled = compile_rule(r).unwrap().unwrap();
    let ctx = MatchContext::new(input, &rules.alias_map, vec![]);
    let cands = generate_seq_candidates(&asl, &ctx, &compiled);
    assert!(cands.is_empty());
}

#[test]
fn utf8_saving_guard_rejects_growth() {
    let (asl, _rules) = classify_en("I am here.");
    let r = rule(
        r#"{
        "id": "t.grow", "phase": "contractions", "kind": "Replace", "layer": "Word",
        "priority": 100,
        "match": [{"word": "i"}, {"whitespace": true}, {"word": "am"}],
        "replacement": "I AM LONGER",
        "guards": {"requires_utf8_saving": true}
    }"#,
    );
    let compiled = compile_rule(&r).unwrap().unwrap();
    let alias = empty_alias();
    let ctx = ctx_for("I am here.", &alias, vec![]);
    let cands = generate_seq_candidates(&asl, &ctx, &compiled);
    assert!(cands.is_empty());
}

#[test]
fn non_empty_sentence_guard() {
    // §21.1: "this" alone must not be removed
    let (asl, rules) = classify_en("this");
    let r = rules.packs[0]
        .rules
        .iter()
        .find(|r| r.id == "en.det.remove")
        .unwrap();
    let compiled = compile_rule(r).unwrap().unwrap();
    let ctx = MatchContext::new("this", &rules.alias_map, vec![]);
    let cands = generate_seq_candidates(&asl, &ctx, &compiled);
    assert!(cands.is_empty());
}
