//! defuss-semantic-compress CLI (§27).
//!
//! ```text
//! defuss-semantic-compress <file> [--json] [--trace] [--debug-candidates] [--lang en] [--rules ./rules] [--tokens]
//! defuss-semantic-compress --stdin [same flags]
//! defuss-semantic-compress ast <file>
//! defuss-semantic-compress test <fixtures-dir>
//! defuss-semantic-compress eval <fixtures-dir> [--report <path>]
//! ```
//!
//! Exit codes: 0 ok, 1 fixture/test failures, 2 usage/IO errors.

use defuss_semantic_compress::{fixtures, parse, CompressConfig, Compressor, TokenCounterKind};
use defuss_semantic_compress_eval::{run_eval, EvalOptions};
use serde_json::{json, Map, Value};
use std::io::Read;
use std::path::{Path, PathBuf};

const USAGE: &str = "usage:
  defuss-semantic-compress <file> [--json] [--trace] [--debug-candidates] [--lang <en>] [--rules <dir>] [--tokens]
  defuss-semantic-compress --stdin [same flags]
  defuss-semantic-compress ast <file>
  defuss-semantic-compress test <fixtures-dir>
  defuss-semantic-compress eval <fixtures-dir> [--report <path>]";

/// Flags shared by the compress and ast subcommands.
#[derive(Default)]
struct Flags {
    json: bool,
    trace: bool,
    debug_candidates: bool,
    tokens: bool,
    stdin: bool,
    lang: Option<String>,
    rules: Option<PathBuf>,
    report: Option<PathBuf>,
    positional: Vec<String>,
}

fn main() {
    std::process::exit(run(std::env::args().skip(1).collect()));
}

fn run(args: Vec<String>) -> i32 {
    match args.first().map(String::as_str) {
        Some("ast") => cmd_ast(&args[1..]),
        Some("test") => cmd_test(&args[1..]),
        Some("eval") => cmd_eval(&args[1..]),
        _ => cmd_compress(&args),
    }
}

/// Hand-rolled flag parser: known flags, `--flag value` and `--flag=value`
/// forms, everything else is positional.
fn parse_flags(args: &[String]) -> Result<Flags, String> {
    let mut f = Flags::default();
    let mut i = 0;
    while i < args.len() {
        let arg = args[i].as_str();
        // value-taking flags in --flag=value form
        if let Some(v) = arg.strip_prefix("--lang=") {
            f.lang = Some(v.to_string());
        } else if let Some(v) = arg.strip_prefix("--rules=") {
            f.rules = Some(PathBuf::from(v));
        } else if let Some(v) = arg.strip_prefix("--report=") {
            f.report = Some(PathBuf::from(v));
        } else {
            match arg {
                "--json" => f.json = true,
                "--trace" => f.trace = true,
                "--debug-candidates" => f.debug_candidates = true,
                "--tokens" => f.tokens = true,
                "--stdin" => f.stdin = true,
                "--lang" | "--rules" | "--report" => {
                    i += 1;
                    let Some(v) = args.get(i) else {
                        return Err(format!("{arg} requires a value"));
                    };
                    match arg {
                        "--lang" => f.lang = Some(v.clone()),
                        "--rules" => f.rules = Some(PathBuf::from(v)),
                        _ => f.report = Some(PathBuf::from(v)),
                    }
                }
                "-h" | "--help" => return Err(USAGE.to_string()),
                s if s.starts_with('-') => return Err(format!("unknown flag: {s}")),
                s => f.positional.push(s.to_string()),
            }
        }
        i += 1;
    }
    Ok(f)
}

/// Reads the input file, or stdin when `--stdin` is set or no file is given.
fn read_input(f: &Flags) -> Result<String, String> {
    match f.positional.first() {
        Some(path) if !f.stdin => std::fs::read_to_string(path)
            .map_err(|e| format!("cannot read {path}: {e}")),
        _ => {
            let mut buf = String::new();
            std::io::stdin()
                .read_to_string(&mut buf)
                .map_err(|e| format!("cannot read stdin: {e}"))?;
            Ok(buf)
        }
    }
}

fn cmd_compress(args: &[String]) -> i32 {
    let f = match parse_flags(args) {
        Ok(f) => f,
        Err(e) => return usage_error(&e),
    };
    if f.positional.len() > 1 {
        return usage_error("at most one input file is allowed");
    }
    let input = match read_input(&f) {
        Ok(s) => s,
        Err(e) => return usage_error(&e),
    };

    let config = CompressConfig {
        lang: f.lang,
        rules_path: f.rules,
        emit_trace: f.trace || f.json,
        emit_rejected_candidates: f.debug_candidates,
        token_counter: if f.tokens {
            Some(TokenCounterKind::Simple)
        } else {
            None
        },
        ..Default::default()
    };
    let compressor = match Compressor::new(config.lang.as_deref(), config.rules_path.as_deref()) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{e}");
            return 2;
        }
    };

    if f.debug_candidates {
        debug_candidates(&compressor, &input, &config);
    }

    let result = match compressor.compress(&input, &config) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("{e}");
            return 2;
        }
    };

    if f.json {
        print_json(&result);
    } else {
        if f.trace {
            for event in &result.trace {
                match serde_json::to_string(event) {
                    Ok(line) => eprintln!("{line}"),
                    Err(e) => eprintln!("cannot serialize trace event: {e}"),
                }
            }
        }
        print!("{}", result.output);
    }
    0
}

fn print_json(result: &defuss_semantic_compress::CompressResult) {
    let m = &result.metrics;
    let mut obj = Map::new();
    obj.insert("input_bytes".into(), json!(m.input_bytes));
    obj.insert("output_bytes".into(), json!(m.output_bytes));
    if let (Some(input), Some(output)) = (m.input_tokens, m.output_tokens) {
        obj.insert("input_tokens".into(), json!(input));
        obj.insert("output_tokens".into(), json!(output));
        obj.insert("token_saving".into(), json!(m.token_saving().unwrap_or(0)));
        let ratio = if input == 0 {
            0.0
        } else {
            m.token_saving().unwrap_or(0) as f64 / input as f64
        };
        obj.insert("token_saving_ratio".into(), json!(ratio));
    }
    obj.insert("output".into(), json!(result.output));
    obj.insert(
        "trace".into(),
        serde_json::to_value(&result.trace).unwrap_or(Value::Null),
    );
    println!("{}", serde_json::to_string_pretty(&Value::Object(obj)).unwrap());
}

fn debug_candidates(compressor: &Compressor, input: &str, config: &CompressConfig) {
    let analysis = compressor.analyze(input, config);
    eprintln!(
        "candidates: {} generated, {} accepted, {} rejected",
        analysis.candidates.len(),
        analysis.accepted.len(),
        analysis.rejected.len()
    );
    for c in &analysis.candidates {
        eprintln!(
            "  generated #{} rule={} kind={} layer={} span={}..{}",
            c.id,
            c.rule_id,
            c.kind.as_str(),
            c.layer.as_str(),
            c.target_span.start,
            c.target_span.end
        );
    }
    for c in &analysis.accepted {
        eprintln!(
            "  accepted  #{} rule={} kind={} span={}..{}",
            c.id,
            c.rule_id,
            c.kind.as_str(),
            c.target_span.start,
            c.target_span.end
        );
    }
    for r in &analysis.rejected {
        eprintln!(
            "  rejected  rule={} span={}..{} reason={}",
            r.rule_id, r.span.start, r.span.end, r.reason
        );
    }
}

fn cmd_ast(args: &[String]) -> i32 {
    let f = match parse_flags(args) {
        Ok(f) => f,
        Err(e) => return usage_error(&e),
    };
    if f.positional.len() > 1 {
        return usage_error("ast takes at most one input file");
    }
    let input = match read_input(&f) {
        Ok(s) => s,
        Err(e) => return usage_error(&e),
    };
    match serde_json::to_string_pretty(&parse(&input)) {
        Ok(json) => {
            println!("{json}");
            0
        }
        Err(e) => {
            eprintln!("cannot serialize ASL: {e}");
            2
        }
    }
}

fn cmd_test(args: &[String]) -> i32 {
    let f = match parse_flags(args) {
        Ok(f) => f,
        Err(e) => return usage_error(&e),
    };
    let Some(dir) = f.positional.first() else {
        return usage_error("test requires a fixtures directory");
    };
    let dir = Path::new(dir);

    let (passed, failures) = fixtures::run_fixture_dir(dir);
    // per-fixture pass/fail: re-list ids so every fixture gets a line
    match fixtures::load_fixtures(dir) {
        Ok(list) => {
            for fx in &list {
                match failures.iter().find(|x| x.id == fx.id) {
                    Some(x) => println!("FAIL {}: {}", fx.id, x.reason),
                    None => println!("PASS {}", fx.id),
                }
            }
        }
        Err(_) => {
            // load error is already reported as a failure by run_fixture_dir
            for x in &failures {
                println!("FAIL {}: {}", x.id, x.reason);
            }
        }
    }
    println!("{}/{} fixtures passed", passed, passed + failures.len());
    if failures.is_empty() {
        0
    } else {
        1
    }
}

fn cmd_eval(args: &[String]) -> i32 {
    let f = match parse_flags(args) {
        Ok(f) => f,
        Err(e) => return usage_error(&e),
    };
    let Some(dir) = f.positional.first() else {
        return usage_error("eval requires a fixtures directory");
    };
    let report = run_eval(
        Path::new(dir),
        &EvalOptions {
            report_path: f.report,
        },
    );
    if report.failures.is_empty() {
        0
    } else {
        1
    }
}

fn usage_error(msg: &str) -> i32 {
    eprintln!("{msg}\n{USAGE}");
    2
}
