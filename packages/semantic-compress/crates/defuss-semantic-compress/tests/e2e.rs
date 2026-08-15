use defuss_semantic_compress::fixtures::run_fixture_dir;
use std::path::PathBuf;

fn e2e_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/e2e")
}

/// §28.3: E2E fixture suite (plain prose, polite prompts, DET/FILLER,
/// complementizer + named entity protection, quotes, code fences, markdown
/// fences, tables, repeat lines, paths, bad words, docstrings, multilingual).
#[test]
fn e2e_fixtures_pass() {
    let (passed, failures) = run_fixture_dir(&e2e_dir());
    for f in &failures {
        eprintln!("FAILED {}: {}", f.id, f.reason);
    }
    assert!(failures.is_empty(), "{} fixtures failed", failures.len());
    assert!(passed >= 15, "expected at least 15 fixtures, ran {passed}");
}
