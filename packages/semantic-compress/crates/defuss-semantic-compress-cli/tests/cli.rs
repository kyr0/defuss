use std::path::Path;
use std::path::PathBuf;
use std::process::Command;

fn bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_defuss-semantic-compress"))
}

fn e2e_fixtures_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/e2e")
}

fn run_stdin(args: &[&str], input: &str) -> std::process::Output {
    let mut child = bin()
        .args(args)
        .arg("--stdin")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .unwrap();
    use std::io::Write;
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(input.as_bytes())
        .unwrap();
    child.wait_with_output().unwrap()
}

#[test]
fn compress_file_prints_compressed_output() {
    let input = "Please, could you fix the bug in this function now?\n";
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("input.md");
    std::fs::write(&path, input).unwrap();

    let out = bin().arg(&path).output().unwrap();
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    let stdout = String::from_utf8(out.stdout).unwrap();

    let expected = defuss_semantic_compress::compress(input, Default::default())
        .unwrap()
        .output;
    assert_eq!(stdout, expected);
    assert!(stdout.len() < input.len(), "expected some compression");
}

#[test]
fn compress_stdin_json_with_tokens() {
    let input = "Please, could you fix the bug in this function now?\n";
    let out = run_stdin(&["--json", "--tokens"], input);
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );

    let json: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    assert!(json["input_bytes"].as_u64().unwrap() > json["output_bytes"].as_u64().unwrap());
    assert!(json["input_tokens"].is_u64());
    assert!(json["output_tokens"].is_u64());
    assert_eq!(
        json["token_saving"].as_u64().unwrap(),
        json["input_tokens"].as_u64().unwrap() - json["output_tokens"].as_u64().unwrap()
    );
    assert!(json["output"].is_string());
    assert!(json["trace"].is_array());
    // v2 additions
    assert_eq!(json["no_candidates_applied"], false);
    assert_eq!(json["idempotent"], true);
    assert!(json["sections"].is_array());
    assert!(!json["sections"].as_array().unwrap().is_empty());
}

#[test]
fn test_subcommand_passes_on_repo_e2e_fixtures() {
    let out = bin().arg("test").arg(e2e_fixtures_dir()).output().unwrap();
    let stdout = String::from_utf8_lossy(&out.stdout);
    assert!(
        out.status.success(),
        "stdout: {stdout}\nstderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    assert!(stdout.contains("PASS en.markdown_table"), "stdout: {stdout}");
}

#[test]
fn ast_subcommand_prints_asl_json() {
    let input = "| Name | Age |\n| --- | --- |\n| Alice | 30 |\n";
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("table.md");
    std::fs::write(&path, input).unwrap();

    let out = bin().arg("ast").arg(&path).output().unwrap();
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    let stdout = String::from_utf8(out.stdout).unwrap();
    assert!(stdout.contains("MarkdownTable"), "stdout: {stdout}");
}

#[test]
fn missing_file_exits_2() {
    let out = bin().arg("/nonexistent/input.md").output().unwrap();
    assert_eq!(out.status.code(), Some(2));
}

#[test]
fn dry_run_reports_would_compress_and_applied_rules() {
    let out = run_stdin(&["--dry-run"], "Please, could you fix the bug now.");
    assert!(
        out.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    let json: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(json["would_compress"], true);
    assert!(json["savings_bytes"].as_u64().unwrap() > 0);
    let applied: Vec<&str> = json["applied_rules"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    assert!(
        applied.contains(&"en.polite.please_could_you"),
        "applied: {applied:?}"
    );
    assert!(json["trace"].is_array());
}

#[test]
fn dry_run_reports_downgraded_rules_below_min_confidence() {
    let out = run_stdin(
        &["--dry-run", "--min-confidence", "0.9"],
        "Please, could you fix the bug",
    );
    assert!(out.status.success());
    let json: serde_json::Value = serde_json::from_slice(&out.stdout).unwrap();
    let downgraded: Vec<&str> = json["downgraded_rules"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap())
        .collect();
    assert!(
        downgraded
            .iter()
            .any(|r| r.contains("en.det.remove") && r.contains("confidence 0.85 < min 0.9")),
        "downgraded: {downgraded:?}"
    );
}

#[test]
fn parser_mode_minimal_compresses_path_inside_fence() {
    let input = "```sh\ncd /Users/aron/x\n```\n";

    // default (full protection): fence body untouched
    let out = run_stdin(&[], input);
    assert!(out.status.success());
    assert_eq!(String::from_utf8(out.stdout).unwrap(), input);

    // minimal protection: path rule fires inside the fence
    let out = run_stdin(&["--parser-mode", "minimal"], input);
    assert!(out.status.success());
    let stdout = String::from_utf8(out.stdout).unwrap();
    assert!(stdout.contains("cd ~/x"), "stdout: {stdout}");
}

#[test]
fn min_confidence_09_keeps_det_words_but_removes_politeness() {
    let out = run_stdin(
        &["--min-confidence", "0.9"],
        "Please, could you fix the bug",
    );
    assert!(out.status.success());
    assert_eq!(String::from_utf8(out.stdout).unwrap(), "fix the bug");
}

#[test]
fn stream_and_parallel_match_whole_input_output() {
    let input = "Please, could you fix the bug in this function now?\n\n```sh\ncd /Users/aron/x\n```\n\nPlease, could you also review the code?\n";

    let whole = run_stdin(&[], input);
    let streamed = run_stdin(&["--stream"], input);
    let parallel = run_stdin(&["--parallel"], input);
    assert!(whole.status.success() && streamed.status.success() && parallel.status.success());
    assert_eq!(streamed.stdout, whole.stdout, "stream output differs");
    assert_eq!(parallel.stdout, whole.stdout, "parallel output differs");
}

#[test]
fn invalid_parser_mode_exits_2() {
    let out = run_stdin(&["--parser-mode", "strict"], "text");
    assert_eq!(out.status.code(), Some(2));
}
