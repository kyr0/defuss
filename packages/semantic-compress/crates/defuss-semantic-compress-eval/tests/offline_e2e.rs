use defuss_semantic_compress_eval::{run_eval, EvalOptions};
use std::path::Path;

fn write_fixture(dir: &Path, name: &str, body: &str) {
    std::fs::write(dir.join(name), body).unwrap();
}

/// Offline end-to-end: mock provider with mock_response passes for both
/// baseline and compressed runs.
#[test]
fn run_eval_passes_with_mock_response() {
    let dir = tempfile::tempdir().unwrap();
    write_fixture(
        dir.path(),
        "fix_bug.json",
        r#"{
  "id": "fix_bug",
  "task_type": "code_patch",
  "input": "Please, could you fix the bug in this function now?\n```ts\nexport function add(a: number, b: number) {\n  return a - b;\n}\n```\n",
  "models": ["mock:echo"],
  "mock_response": "fix: return a + b to fix the bug",
  "assert": { "type": "contains_required_terms", "terms": ["fix", "bug"] }
}"#,
    );
    let report = run_eval(dir.path(), &EvalOptions::default());
    assert_eq!(report.total, 1);
    assert_eq!(report.passed, 1);
    assert!(report.failures.is_empty());
}

/// Mock echo (no mock_response): the assertion must hold for the echoed
/// compressed prompt as well.
#[test]
fn run_eval_passes_with_mock_echo() {
    let dir = tempfile::tempdir().unwrap();
    write_fixture(
        dir.path(),
        "echo.json",
        r#"{
  "id": "echo",
  "task_type": "echo",
  "input": "fix the bug in this function",
  "models": ["mock:echo"],
  "assert": { "type": "contains_required_terms", "terms": ["fix", "bug"] }
}"#,
    );
    let report = run_eval(dir.path(), &EvalOptions::default());
    assert_eq!(report.passed, 1, "failures: {:?}", report.failures);
}

/// Fail path: mock_response misses a required term.
#[test]
fn run_eval_fails_when_assertion_fails() {
    let dir = tempfile::tempdir().unwrap();
    write_fixture(
        dir.path(),
        "missing_term.json",
        r#"{
  "id": "missing_term",
  "task_type": "code_patch",
  "input": "fix the bug",
  "models": ["mock:echo"],
  "mock_response": "done",
  "assert": { "type": "contains_required_terms", "terms": ["fix", "bug"] }
}"#,
    );
    let report = run_eval(dir.path(), &EvalOptions::default());
    assert_eq!(report.total, 1);
    assert_eq!(report.passed, 0);
    assert_eq!(report.failures.len(), 2); // baseline + compressed
    assert!(report.failures[0].details.contains("baseline assertion failed"));
    assert!(report.failures[1].details.contains("compressed assertion failed"));
}

/// Fail path: strict_equivalence with echo — compression changes the prompt,
/// so baseline and compressed outputs differ.
#[test]
fn run_eval_strict_equivalence_fails_on_divergent_outputs() {
    let dir = tempfile::tempdir().unwrap();
    write_fixture(
        dir.path(),
        "strict.json",
        r#"{
  "id": "strict",
  "task_type": "echo",
  "input": "Please, could you fix the bug in this function now?",
  "models": ["mock:echo"],
  "strict_equivalence": true,
  "assert": { "type": "contains_required_terms", "terms": ["fix", "bug"] }
}"#,
    );
    let report = run_eval(dir.path(), &EvalOptions::default());
    assert_eq!(report.passed, 0);
    assert!(report
        .failures
        .iter()
        .any(|f| f.details.contains("strict equivalence failed")));
}

/// The JSON report is written when report_path is set.
#[test]
fn run_eval_writes_report() {
    let dir = tempfile::tempdir().unwrap();
    write_fixture(
        dir.path(),
        "fix_bug.json",
        r#"{
  "id": "fix_bug",
  "task_type": "code_patch",
  "input": "fix the bug",
  "models": ["mock:echo"],
  "mock_response": "fix the bug",
  "assert": { "type": "contains_required_terms", "terms": ["fix"] }
}"#,
    );
    let report_path = dir.path().join("report.json");
    let opts = EvalOptions {
        report_path: Some(report_path.clone()),
    };
    let report = run_eval(dir.path(), &opts);
    assert_eq!(report.passed, 1);

    let written: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&report_path).unwrap()).unwrap();
    assert_eq!(written["total"], 1);
    assert_eq!(written["passed"], 1);
    assert_eq!(written["failures"], serde_json::json!([]));
}

/// Per-fixture report entries carry the compressed run's per-section
/// metrics (v2): a two-block input yields two section entries.
#[test]
fn run_eval_report_includes_sections() {
    let dir = tempfile::tempdir().unwrap();
    write_fixture(
        dir.path(),
        "two_blocks.json",
        r#"{
  "id": "two_blocks",
  "task_type": "echo",
  "input": "Please, could you fix the bug in this function now?\n\n```sh\ncd /Users/aron/x\n```\n",
  "models": ["mock:echo"],
  "mock_response": "fix the bug",
  "assert": { "type": "contains_required_terms", "terms": ["fix"] }
}"#,
    );
    let report = run_eval(dir.path(), &EvalOptions::default());
    assert_eq!(report.passed, 1, "failures: {:?}", report.failures);

    assert_eq!(report.results.len(), 1);
    let entry = &report.results[0];
    assert_eq!(entry.id, "two_blocks");
    assert!(entry.passed);
    assert!(entry.input_bytes > entry.output_bytes);
    assert_eq!(entry.byte_saving, entry.input_bytes - entry.output_bytes);
    assert!(
        entry.sections.len() >= 2,
        "expected >= 2 sections (paragraph + codefence), got {:?}",
        entry.sections
    );
    assert_eq!(entry.sections[0].kind, "paragraph");
    assert_eq!(entry.sections[1].kind, "codefence");
}
