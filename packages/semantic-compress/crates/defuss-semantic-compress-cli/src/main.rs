//! defuss-semantic-compress CLI (§24, v2).
//!
//! ```text
//! defuss-semantic-compress <file> [flags]
//! defuss-semantic-compress --stdin [flags]
//! defuss-semantic-compress ast <file>
//! defuss-semantic-compress test <fixtures-dir>
//! defuss-semantic-compress eval <fixtures-dir> [--report <path>]
//! ```
//!
//! Flags: --json --trace --debug-candidates --tokens --lang <en>
//!        --rules <dir> (repeatable: first replaces builtin, rest are extra)
//!        --dry-run --stream --parallel
//!        --parser-mode full|partial|minimal
//!        --min-confidence <f32> --min-output-ratio <f32>
//!        --max-removal-tokens <usize>
//!
//! Exit codes: 0 ok, 1 fixture/test failures, 2 usage/IO errors.

use defuss_semantic_compress::metrics::simple_token_count;
use defuss_semantic_compress::parse::block::split_lines;
use defuss_semantic_compress::parse::codefence::{fence_close, fence_open};
use defuss_semantic_compress::{
    compress_chunked, fixtures, parse, Analysis, CompressConfig, CompressResult, Compressor,
    Metrics, ParserMode, TokenCounterKind,
};
use defuss_semantic_compress_eval::{run_eval, EvalOptions};
use serde_json::{json, Map, Value};
use std::io::{BufRead, Read, Write};
use std::path::{Path, PathBuf};

const USAGE: &str = "usage:
  defuss-semantic-compress <file> [--json] [--trace] [--debug-candidates] [--tokens]
                                 [--lang <en>] [--rules <dir>]...
                                 [--dry-run] [--stream] [--parallel]
                                 [--parser-mode full|partial|minimal]
                                 [--min-confidence <f32>] [--min-output-ratio <f32>]
                                 [--max-removal-tokens <n>]
  defuss-semantic-compress --stdin [same flags]
  defuss-semantic-compress ast <file>
  defuss-semantic-compress test <fixtures-dir>
  defuss-semantic-compress eval <fixtures-dir> [--report <path>]";

#[derive(Default)]
struct Flags {
    json: bool,
    trace: bool,
    debug_candidates: bool,
    tokens: bool,
    stdin: bool,
    dry_run: bool,
    stream: bool,
    parallel: bool,
    lang: Option<String>,
    /// Repeatable: first occurrence becomes `rules_path`, rest `extra_rules`.
    rules: Vec<PathBuf>,
    parser_mode: Option<ParserMode>,
    min_confidence: Option<f32>,
    min_output_ratio: Option<f32>,
    max_removal_tokens: Option<usize>,
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
    // value-taking flags in --flag=value form; returns true when recognized
    let eq_form = |f: &mut Flags, arg: &str| -> Result<bool, String> {
        let Some((name, v)) = arg.split_once('=') else {
            return Ok(false);
        };
        match name {
            "--lang" => f.lang = Some(v.to_string()),
            "--rules" => f.rules.push(PathBuf::from(v)),
            "--report" => f.report = Some(PathBuf::from(v)),
            "--parser-mode" => f.parser_mode = Some(parse_parser_mode(v)?),
            "--min-confidence" => {
                f.min_confidence = Some(parse_f32("--min-confidence", v)?);
            }
            "--min-output-ratio" => {
                f.min_output_ratio = Some(parse_f32("--min-output-ratio", v)?);
            }
            "--max-removal-tokens" => {
                f.max_removal_tokens = Some(parse_usize("--max-removal-tokens", v)?);
            }
            _ => return Ok(false),
        }
        Ok(true)
    };

    let mut i = 0;
    while i < args.len() {
        let arg = args[i].as_str();
        if eq_form(&mut f, arg)? {
            i += 1;
            continue;
        }
        match arg {
            "--json" => f.json = true,
            "--trace" => f.trace = true,
            "--debug-candidates" => f.debug_candidates = true,
            "--tokens" => f.tokens = true,
            "--stdin" => f.stdin = true,
            "--dry-run" => f.dry_run = true,
            "--stream" => f.stream = true,
            "--parallel" => f.parallel = true,
            "--lang" | "--rules" | "--report" | "--parser-mode" | "--min-confidence"
            | "--min-output-ratio" | "--max-removal-tokens" => {
                i += 1;
                let Some(v) = args.get(i) else {
                    return Err(format!("{arg} requires a value"));
                };
                match arg {
                    "--lang" => f.lang = Some(v.clone()),
                    "--rules" => f.rules.push(PathBuf::from(v)),
                    "--report" => f.report = Some(PathBuf::from(v)),
                    "--parser-mode" => f.parser_mode = Some(parse_parser_mode(v)?),
                    "--min-confidence" => {
                        f.min_confidence = Some(parse_f32("--min-confidence", v)?);
                    }
                    "--min-output-ratio" => {
                        f.min_output_ratio = Some(parse_f32("--min-output-ratio", v)?);
                    }
                    _ => {
                        f.max_removal_tokens = Some(parse_usize("--max-removal-tokens", v)?);
                    }
                }
            }
            "-h" | "--help" => return Err(USAGE.to_string()),
            s if s.starts_with('-') => return Err(format!("unknown flag: {s}")),
            s => f.positional.push(s.to_string()),
        }
        i += 1;
    }
    Ok(f)
}

fn parse_parser_mode(v: &str) -> Result<ParserMode, String> {
    match v {
        "full" => Ok(ParserMode::FullProtection),
        "partial" => Ok(ParserMode::PartialProtection),
        "minimal" => Ok(ParserMode::MinimalProtection),
        _ => Err(format!(
            "invalid --parser-mode {v:?} (expected full|partial|minimal)"
        )),
    }
}

fn parse_f32(flag: &str, v: &str) -> Result<f32, String> {
    v.parse::<f32>()
        .map_err(|_| format!("{flag} expects a number, got {v:?}"))
}

fn parse_usize(flag: &str, v: &str) -> Result<usize, String> {
    v.parse::<usize>()
        .map_err(|_| format!("{flag} expects a non-negative integer, got {v:?}"))
}

/// Reads the input file, or stdin when `--stdin` is set or no file is given.
fn read_input(f: &Flags) -> Result<String, String> {
    match f.positional.first() {
        Some(path) if !f.stdin => {
            std::fs::read_to_string(path).map_err(|e| format!("cannot read {path}: {e}"))
        }
        _ => {
            let mut buf = String::new();
            std::io::stdin()
                .read_to_string(&mut buf)
                .map_err(|e| format!("cannot read stdin: {e}"))?;
            Ok(buf)
        }
    }
}

/// Streaming variant of [`read_input`]: buffered file or stdin.
fn open_input(f: &Flags) -> Result<Box<dyn BufRead>, String> {
    match f.positional.first() {
        Some(path) if !f.stdin => {
            let file =
                std::fs::File::open(path).map_err(|e| format!("cannot read {path}: {e}"))?;
            Ok(Box::new(std::io::BufReader::new(file)))
        }
        _ => Ok(Box::new(std::io::BufReader::new(std::io::stdin()))),
    }
}

fn config_from_flags(f: &Flags) -> CompressConfig {
    let mut config = CompressConfig {
        lang: f.lang.clone(),
        rules_path: f.rules.first().cloned(),
        extra_rules: f.rules.iter().skip(1).cloned().collect(),
        emit_trace: f.trace || f.json || f.dry_run,
        emit_rejected_candidates: f.debug_candidates,
        token_counter: if f.tokens {
            Some(TokenCounterKind::Simple)
        } else {
            None
        },
        ..Default::default()
    };
    if let Some(mode) = f.parser_mode {
        config.parser_mode = mode;
    }
    if let Some(c) = f.min_confidence {
        config.min_confidence = c;
    }
    if let Some(r) = f.min_output_ratio {
        config.min_output_ratio = r;
    }
    if let Some(n) = f.max_removal_tokens {
        config.max_removal_tokens = Some(n);
    }
    config
}

fn cmd_compress(args: &[String]) -> i32 {
    let f = match parse_flags(args) {
        Ok(f) => f,
        Err(e) => return usage_error(&e),
    };
    if f.positional.len() > 1 {
        return usage_error("at most one input file is allowed");
    }
    let config = config_from_flags(&f);
    let compressor = match Compressor::from_config(&config) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("{e}");
            return 2;
        }
    };

    // --stream without --json: genuine streaming, each chunk is printed as
    // soon as it is compressed.
    if f.stream && !f.json {
        let reader = match open_input(&f) {
            Ok(r) => r,
            Err(e) => return usage_error(&e),
        };
        return run_stream(reader, &compressor, &config);
    }

    let input = match read_input(&f) {
        Ok(s) => s,
        Err(e) => return usage_error(&e),
    };

    if f.dry_run {
        return match compressor.analyze(&input, &config) {
            Ok(analysis) => {
                print_dry_run(&input, &analysis, &config);
                0
            }
            Err(e) => {
                eprintln!("{e}");
                2
            }
        };
    }

    if f.debug_candidates {
        match compressor.analyze(&input, &config) {
            Ok(analysis) => debug_candidates(&analysis),
            Err(e) => {
                eprintln!("{e}");
                return 2;
            }
        }
    }

    let result = if f.parallel {
        match compress_parallel(&input, &compressor, &config) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("{e}");
                return 2;
            }
        }
    } else if f.stream {
        // --stream --json: chunked processing, one merged JSON document
        match compress_chunked(&input, config.clone()) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("{e}");
                return 2;
            }
        }
    } else {
        match compressor.compress(&input, &config) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("{e}");
                return 2;
            }
        }
    };

    emit_result(&result, f.json, f.trace);
    0
}

fn emit_result(result: &CompressResult, json: bool, trace: bool) {
    if json {
        print_json(result);
    } else {
        if trace {
            print_trace_lines(result);
        }
        print!("{}", result.output);
    }
}

fn print_trace_lines(result: &CompressResult) {
    for event in &result.trace {
        match serde_json::to_string(event) {
            Ok(line) => eprintln!("{line}"),
            Err(e) => eprintln!("cannot serialize trace event: {e}"),
        }
    }
}

fn print_json(result: &CompressResult) {
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
    obj.insert(
        "no_candidates_applied".into(),
        json!(result.no_candidates_applied),
    );
    obj.insert("idempotent".into(), json!(result.idempotent));
    obj.insert("output".into(), json!(result.output));
    obj.insert(
        "trace".into(),
        serde_json::to_value(&result.trace).unwrap_or(Value::Null),
    );
    obj.insert(
        "sections".into(),
        serde_json::to_value(&m.sections).unwrap_or(Value::Null),
    );
    println!(
        "{}",
        serde_json::to_string_pretty(&Value::Object(obj)).unwrap()
    );
}

/// §24 dry-run report: what would be applied, downgraded or rejected —
/// without emitting the compressed text.
fn print_dry_run(input: &str, analysis: &Analysis, config: &CompressConfig) {
    let input_bytes = input.len();
    let output_bytes = analysis.output.len();
    let savings = input_bytes.saturating_sub(output_bytes);
    let ratio = if input_bytes == 0 {
        0.0
    } else {
        savings as f64 / input_bytes as f64
    };

    let dedup = |ids: Vec<String>| -> Vec<String> {
        let mut seen: Vec<String> = Vec::new();
        for id in ids {
            if !seen.contains(&id) {
                seen.push(id);
            }
        }
        seen
    };
    let applied: Vec<String> =
        dedup(analysis.accepted.iter().map(|c| c.rule_id.clone()).collect());
    let downgraded: Vec<String> = dedup(
        analysis
            .review
            .iter()
            .map(|c| {
                format!(
                    "{} (confidence {} < min {})",
                    c.rule_id, c.confidence, config.min_confidence
                )
            })
            .collect(),
    );
    let rejected: Vec<String> = dedup(
        analysis
            .rejected
            .iter()
            .map(|r| format!("{} ({})", r.rule_id, r.reason))
            .collect(),
    );

    let mut obj = Map::new();
    obj.insert("would_compress".into(), json!(output_bytes < input_bytes));
    obj.insert("input_bytes".into(), json!(input_bytes));
    obj.insert("output_bytes".into(), json!(output_bytes));
    obj.insert("savings_bytes".into(), json!(savings));
    obj.insert("savings_ratio".into(), json!(ratio));
    obj.insert("applied_rules".into(), json!(applied));
    obj.insert("downgraded_rules".into(), json!(downgraded));
    obj.insert("rejected_rules".into(), json!(rejected));
    obj.insert(
        "trace".into(),
        serde_json::to_value(&analysis.trace).unwrap_or(Value::Null),
    );
    println!(
        "{}",
        serde_json::to_string_pretty(&Value::Object(obj)).unwrap()
    );
}

fn debug_candidates(analysis: &Analysis) {
    eprintln!(
        "candidates: {} generated, {} accepted, {} rejected, {} downgraded",
        analysis.candidates.len(),
        analysis.accepted.len(),
        analysis.rejected.len(),
        analysis.review.len()
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
            "  accepted   #{} rule={} kind={} span={}..{}",
            c.id,
            c.rule_id,
            c.kind.as_str(),
            c.target_span.start,
            c.target_span.end
        );
    }
    for c in &analysis.review {
        eprintln!(
            "  downgraded #{} rule={} confidence={} span={}..{}",
            c.id, c.rule_id, c.confidence, c.target_span.start, c.target_span.end
        );
    }
    for r in &analysis.rejected {
        eprintln!(
            "  rejected   rule={} span={}..{} reason={}",
            r.rule_id, r.span.start, r.span.end, r.reason
        );
    }
}

/// Splits input into (start, end) chunk spans at blank lines outside code
/// fences. Mirrors the core's chunked-processing split (§25).
fn chunk_spans(input: &str) -> Vec<(usize, usize)> {
    let lines = split_lines(input);
    let mut spans = Vec::new();
    let mut chunk_start = 0usize;
    let mut in_fence: Option<(char, usize)> = None;
    for line in &lines {
        let text = line.text(input);
        match in_fence {
            Some((fc, fl)) => {
                if fence_close(text, fc, fl) {
                    in_fence = None;
                }
            }
            None => {
                if let Some((fc, fl, _)) = fence_open(text) {
                    in_fence = Some((fc, fl));
                } else if line.is_blank(input) && line.nl_end > chunk_start {
                    spans.push((chunk_start, line.nl_end));
                    chunk_start = line.nl_end;
                }
            }
        }
    }
    if chunk_start < input.len() {
        spans.push((chunk_start, input.len()));
    }
    spans
}

/// §25 streaming: read line by line, accumulate a chunk until a blank line
/// outside a code fence, compress and print each chunk immediately.
fn run_stream(
    mut reader: Box<dyn BufRead>,
    compressor: &Compressor,
    config: &CompressConfig,
) -> i32 {
    let mut chunk = String::new();
    let mut in_fence: Option<(char, usize)> = None;

    let mut line = String::new();
    loop {
        line.clear();
        match reader.read_line(&mut line) {
            Ok(0) => break, // EOF
            Ok(_) => {}
            Err(e) => {
                eprintln!("cannot read input: {e}");
                return 2;
            }
        }
        chunk.push_str(&line);
        let text = line.strip_suffix('\n').unwrap_or(&line);
        match in_fence {
            Some((fc, fl)) => {
                if fence_close(text, fc, fl) {
                    in_fence = None;
                }
            }
            None => {
                if let Some((fc, fl, _)) = fence_open(text) {
                    in_fence = Some((fc, fl));
                } else if text.trim().is_empty() {
                    if !flush_chunk(&chunk, compressor, config) {
                        return 2;
                    }
                    chunk.clear();
                }
            }
        }
    }
    if !chunk.is_empty() && !flush_chunk(&chunk, compressor, config) {
        return 2;
    }
    0
}

/// Compresses and prints one stream chunk (plus its trace). False on error.
fn flush_chunk(chunk: &str, compressor: &Compressor, config: &CompressConfig) -> bool {
    match compressor.compress(chunk, config) {
        Ok(result) => {
            if config.emit_trace {
                print_trace_lines(&result);
            }
            let stdout = std::io::stdout();
            let mut out = stdout.lock();
            let _ = out.write_all(result.output.as_bytes());
            let _ = out.flush();
            true
        }
        Err(e) => {
            eprintln!("{e}");
            false
        }
    }
}

/// §25 parallel: fence-aware chunks, each compressed on its own thread,
/// results concatenated in order with re-based spans.
fn compress_parallel(
    input: &str,
    compressor: &Compressor,
    config: &CompressConfig,
) -> Result<CompressResult, defuss_semantic_compress::CompressError> {
    let chunks = chunk_spans(input);
    if chunks.len() <= 1 {
        return compressor.compress(input, config);
    }
    let results: Vec<CompressResult> = std::thread::scope(|scope| {
        let handles: Vec<_> = chunks
            .iter()
            .map(|&(start, end)| {
                scope.spawn(move || compressor.compress(&input[start..end], config))
            })
            .collect();
        handles
            .into_iter()
            .map(|h| h.join().expect("compression worker panicked"))
            .collect::<Result<Vec<_>, _>>()
    })?;
    Ok(merge_chunk_results(input, &chunks, results, config))
}

/// Merges per-chunk results into one document-level result (§25), re-basing
/// trace/rejected spans into document coordinates.
fn merge_chunk_results(
    input: &str,
    chunks: &[(usize, usize)],
    results: Vec<CompressResult>,
    config: &CompressConfig,
) -> CompressResult {
    use defuss_semantic_compress::Span;

    let mut output = String::with_capacity(input.len());
    let mut trace = Vec::new();
    let mut rejected = Vec::new();
    let mut metrics = Metrics::default();
    let mut no_applied = true;

    for ((start, _), result) in chunks.iter().zip(results) {
        output.push_str(&result.output);
        trace.extend(result.trace.into_iter().map(|mut t| {
            t.span = Span::new(t.span.start + start, t.span.end + start);
            t
        }));
        rejected.extend(result.rejected.into_iter().map(|mut r| {
            r.span = Span::new(r.span.start + start, r.span.end + start);
            r
        }));
        metrics.sections.extend(result.metrics.sections);
        if result.metrics.candidates_accepted > 0 {
            no_applied = false;
        }
        metrics.candidates_generated += result.metrics.candidates_generated;
        metrics.candidates_accepted += result.metrics.candidates_accepted;
        metrics.candidates_rejected += result.metrics.candidates_rejected;
        metrics.safety_violations += result.metrics.safety_violations;
    }
    metrics.input_bytes = input.len();
    metrics.output_bytes = output.len();
    if let Some(TokenCounterKind::Simple) = config.token_counter {
        metrics.input_tokens = Some(simple_token_count(&parse(input)));
        metrics.output_tokens = Some(simple_token_count(&parse(&output)));
    }

    CompressResult {
        output,
        trace: if config.emit_trace { trace } else { Vec::new() },
        rejected: if config.emit_rejected_candidates {
            rejected
        } else {
            Vec::new()
        },
        metrics,
        asl_debug: None,
        idempotent: true, // per-chunk safety checks already ran
        no_candidates_applied: no_applied,
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
    if failures.is_empty() { 0 } else { 1 }
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
    if report.failures.is_empty() { 0 } else { 1 }
}

fn usage_error(msg: &str) -> i32 {
    eprintln!("{msg}\n{USAGE}");
    2
}
