use std::path::PathBuf;
use std::process::Command;

fn bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_defuss-semantic-compress"))
}

fn e2e_fixtures_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/e2e")
}

use std::path::Path;

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
    let mut child = bin()
        .args(["--stdin", "--json", "--tokens"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()
        .unwrap();
    use std::io::Write;
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(input.as_bytes())
        .unwrap();
    let out = child.wait_with_output().unwrap();
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
