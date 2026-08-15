//! §26.7 rule pack validation tests + §10.1 schema versioning.

use defuss_semantic_compress::rules::loader::{
    load_rules, validate_rule_pack, validate_schema_version, RulePack, RuleSource,
    SUPPORTED_SCHEMA_VERSION,
};
use defuss_semantic_compress::classify::lexicon::Lexicon;
use defuss_semantic_compress::rules::schema::*;
use std::collections::BTreeMap;

fn base_pack(rules: Vec<RuleJson>) -> RulePack {
    let mut classes = BTreeMap::new();
    classes.insert("det".to_string(), vec!["the".to_string()]);
    RulePack {
        id: "test/xx/base".to_string(),
        version: "0.1.0".to_string(),
        schema_version: "1.0".to_string(),
        source: RuleSource::Builtin,
        lang: "xx".to_string(),
        lexicon: Lexicon {
            schema_version: "1.0".to_string(),
            language: "xx".to_string(),
            classes,
        },
        bad_words: vec!["darn".to_string()],
        grammar: GrammarRulesJson {
            schema_version: "1.0".to_string(),
            language: "xx".to_string(),
            classify_rules: vec![],
            named_entities: vec![],
            particle_word: None,
            infinitive_verbs: vec![],
        },
        rules,
        action_words: vec![],
    }
}

fn rule(id: &str) -> RuleJson {
    serde_json::from_str(&format!(
        r#"{{
            "id": "{id}", "phase": "det_filler", "kind": "Remove", "layer": "Word",
            "priority": 200, "match": [{{"class": "Det"}}]
        }}"#
    ))
    .unwrap()
}

#[test]
fn schema_version_accepted_when_not_newer() {
    assert!(validate_schema_version(SUPPORTED_SCHEMA_VERSION, "1.0").is_ok());
    assert!(validate_schema_version(SUPPORTED_SCHEMA_VERSION, "0.9").is_ok());
}

#[test]
fn schema_version_rejected_when_newer() {
    assert!(validate_schema_version(SUPPORTED_SCHEMA_VERSION, "2.0").is_err());
    assert!(validate_schema_version(SUPPORTED_SCHEMA_VERSION, "1.1").is_err());
}

#[test]
fn shipped_packs_validate() {
    let rules = load_rules(None, None, &[]).unwrap();
    for pack in &rules.packs {
        assert!(validate_rule_pack(pack).is_ok(), "pack {} invalid", pack.id);
        assert_eq!(pack.source, RuleSource::Builtin);
        assert_eq!(pack.schema_version, "1.0");
    }
}

#[test]
fn validation_rejects_duplicate_rule_ids() {
    let pack = base_pack(vec![rule("x.dup"), rule("x.dup")]);
    let err = validate_rule_pack(&pack).unwrap_err();
    assert!(err.iter().any(|f| f.reason.contains("duplicate rule id")));
}

#[test]
fn validation_rejects_unknown_class_reference() {
    let bad: RuleJson = serde_json::from_str(
        r#"{
            "id": "x.bad_class", "phase": "det_filler", "kind": "Remove", "layer": "Word",
            "priority": 1, "match": [{"class": "Nope"}]
        }"#,
    )
    .unwrap();
    let pack = base_pack(vec![bad]);
    let err = validate_rule_pack(&pack).unwrap_err();
    assert!(err.iter().any(|f| f.reason.contains("not in lexicon")));
}

#[test]
fn validation_rejects_bad_regex() {
    let bad: RuleJson = serde_json::from_str(
        r#"{
            "id": "x.bad_regex", "phase": "paths", "kind": "Replace", "layer": "Phrase",
            "priority": 1, "regex": "/Users/[", "replacement": "~"
        }"#,
    )
    .unwrap();
    let pack = base_pack(vec![bad]);
    let err = validate_rule_pack(&pack).unwrap_err();
    assert!(err.iter().any(|f| f.reason.contains("does not compile")));
}

#[test]
fn validation_rejects_confidence_out_of_range() {
    let mut r = rule("x.conf");
    r.confidence = 1.5;
    let pack = base_pack(vec![r]);
    let err = validate_rule_pack(&pack).unwrap_err();
    assert!(err.iter().any(|f| f.reason.contains("confidence")));
}

#[test]
fn validation_rejects_newer_schema_version() {
    let mut pack = base_pack(vec![rule("x.ok")]);
    pack.schema_version = "2.0".to_string();
    let err = validate_rule_pack(&pack).unwrap_err();
    assert!(err.iter().any(|f| f.reason.contains("schema version")));
}

#[test]
fn loader_rejects_pack_with_newer_schema() {
    // write a temp pack with schema_version 9.9
    let dir = std::env::temp_dir().join("sc_schema_test_xx");
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
        dir.join("lexicon.json"),
        r#"{"schema_version": "9.9", "language": "xx", "classes": {}}"#,
    )
    .unwrap();
    for (name, content) in [
        ("bad_words.json", r#"{"language":"xx","words":[]}"#),
        ("grammar_rules.json", r#"{"language":"xx"}"#),
        ("replacements.json", r#"{"language":"xx","rules":[]}"#),
        ("politeness_phrases.json", r#"{"language":"xx","rules":[]}"#),
        ("paths.json", r#"{"rules":[]}"#),
    ] {
        std::fs::write(dir.join(name), content).unwrap();
    }
    let parent = dir.parent().unwrap().to_path_buf();
    // pack lives at <tmp>/sc_schema_test_xx -> rules_path layout needs <base>/<lang>/
    let base = parent.join("sc_schema_rules");
    std::fs::create_dir_all(&base).unwrap();
    let target = base.join("xx");
    if target.exists() {
        std::fs::remove_dir_all(&target).unwrap();
    }
    std::fs::rename(&dir, &target).unwrap();
    std::fs::create_dir_all(base.join("shared")).unwrap();
    std::fs::write(base.join("shared").join("markdown.json"), r#"{"blank_line_collapse":true,"table_compress":true,"final_period":true,"docstring_collapse":true}"#).unwrap();
    std::fs::write(base.join("shared").join("codefence_formats.json"), r#"{"formats":{}}"#).unwrap();

    let result = load_rules(Some("xx"), Some(&base), &[]);
    assert!(result.is_err(), "load should reject newer schema");
    let msg = result.err().unwrap().to_string();
    assert!(msg.contains("schema version"), "unexpected: {msg}");
    std::fs::remove_dir_all(&base).ok();
}

#[test]
fn extra_rules_compose_with_builtin() {
    // §23: extra_rules add packs on top of the builtin ones
    let base = std::env::temp_dir().join("sc_extra_rules_xx");
    let pack_dir = base.join("xx");
    std::fs::create_dir_all(&pack_dir).unwrap();
    std::fs::write(
        pack_dir.join("lexicon.json"),
        r#"{"language": "xx", "classes": {"filler": ["frobnicate"]}}"#,
    )
    .unwrap();
    for (name, content) in [
        ("bad_words.json", r#"{"language":"xx","words":[]}"#),
        ("grammar_rules.json", r#"{"language":"xx"}"#),
        ("politeness_phrases.json", r#"{"language":"xx","rules":[]}"#),
        ("paths.json", r#"{"rules":[]}"#),
    ] {
        std::fs::write(pack_dir.join(name), content).unwrap();
    }
    std::fs::write(
        pack_dir.join("replacements.json"),
        r#"{"language":"xx","rules":[{"id":"xx.filler.remove","phase":"det_filler","kind":"Remove","layer":"Word","priority":200,"match":[{"class":"Filler"}],"guards":{"requires_non_empty_sentence":true}}]}"#,
    )
    .unwrap();

    let rules = load_rules(Some("en"), None, &[pack_dir.clone()]).unwrap();
    assert_eq!(rules.packs.len(), 2);
    assert!(rules.packs.iter().any(|p| p.lang == "xx"));

    // and the extra pack's rule actually fires
    let out = defuss_semantic_compress::compress(
        "Please frobnicate the fix.",
        defuss_semantic_compress::CompressConfig {
            lang: Some("en".to_string()),
            extra_rules: vec![pack_dir.clone()],
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(out.output, "fix");
    std::fs::remove_dir_all(&base).ok();
}
