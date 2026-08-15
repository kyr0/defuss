use defuss_semantic_compress_eval::Assertion;
use serde_json::json;

fn exact_json(expected: serde_json::Value) -> Assertion {
    Assertion::ExactJson { expected }
}

#[test]
fn exact_json_passes_on_equal_value() {
    let a = exact_json(json!({"name": "Alice", "age": 30}));
    assert!(a.check(r#"{"age": 30, "name": "Alice"}"#).is_ok());
}

#[test]
fn exact_json_fails_on_different_value() {
    let a = exact_json(json!({"name": "Alice"}));
    assert!(a.check(r#"{"name": "Bob"}"#).is_err());
}

#[test]
fn exact_json_fails_on_non_json() {
    let a = exact_json(json!({"name": "Alice"}));
    assert!(a.check("not json").is_err());
}

#[test]
fn json_schema_match_passes_on_subset() {
    let a = Assertion::JsonSchemaMatch {
        expected: json!({"user": {"name": "Alice"}}),
    };
    assert!(a
        .check(r#"{"user": {"name": "Alice", "age": 30}, "extra": true}"#)
        .is_ok());
}

#[test]
fn json_schema_match_fails_on_missing_key() {
    let a = Assertion::JsonSchemaMatch {
        expected: json!({"user": {"name": "Alice"}}),
    };
    assert!(a.check(r#"{"user": {"age": 30}}"#).is_err());
}

#[test]
fn json_schema_match_fails_on_type_mismatch() {
    let a = Assertion::JsonSchemaMatch {
        expected: json!({"items": ["a"]}),
    };
    // array length mismatch is not a shape match
    assert!(a.check(r#"{"items": ["a", "b"]}"#).is_err());
}

#[test]
fn tool_call_equivalence_compares_structurally() {
    let a = Assertion::ToolCallEquivalence {
        expected: json!({"tool": "search", "args": {"q": "defuss"}}),
    };
    assert!(a
        .check(r#"{"args": {"q": "defuss"}, "tool": "search"}"#)
        .is_ok());
    assert!(a
        .check(r#"{"tool": "search", "args": {"q": "other"}}"#)
        .is_err());
}

#[test]
fn tests_pass_uses_exit_code() {
    let ok = Assertion::TestsPass {
        command: "exit 0".to_string(),
        cwd: None,
    };
    assert!(ok.check("ignored output").is_ok());

    let fail = Assertion::TestsPass {
        command: "exit 1".to_string(),
        cwd: None,
    };
    assert!(fail.check("ignored output").is_err());
}

#[test]
fn tests_pass_respects_cwd() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join("marker.txt"), "x").unwrap();
    let a = Assertion::TestsPass {
        command: "test -f marker.txt".to_string(),
        cwd: Some(dir.path().display().to_string()),
    };
    assert!(a.check("").is_ok());
}

#[test]
fn contains_required_terms_is_case_insensitive() {
    let a = Assertion::ContainsRequiredTerms {
        terms: vec!["fix".to_string(), "BUG".to_string()],
    };
    assert!(a.check("Fix the bug now").is_ok());
    assert!(a.check("Fix it now").is_err());
}

#[test]
fn forbidden_terms_is_case_insensitive() {
    let a = Assertion::DoesNotContainForbiddenTerms {
        terms: vec!["error".to_string()],
    };
    assert!(a.check("all good").is_ok());
    assert!(a.check("an ERROR occurred").is_err());
}

#[test]
fn classification_label_match_trims() {
    let a = Assertion::ClassificationLabelMatch {
        expected: "positive".to_string(),
    };
    assert!(a.check("  positive\n").is_ok());
    assert!(a.check("negative").is_err());
}

#[test]
fn diff_equivalence_normalizes_whitespace() {
    let a = Assertion::DiffEquivalence {
        expected: "line one\n  line   two".to_string(),
    };
    assert!(a.check("line one line two").is_ok());
    assert!(a.check("line one line three").is_err());
}

#[test]
fn assertion_deserializes_from_fixture_json() {
    let a: Assertion = serde_json::from_str(
        r#"{"type": "contains_required_terms", "terms": ["fix", "bug"]}"#,
    )
    .unwrap();
    assert!(a.check("fix the bug").is_ok());
}
