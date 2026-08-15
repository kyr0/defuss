//! Runner (§29.5): for each fixture and model, run baseline (original input)
//! and compressed (compressor output) completions; the fixture passes iff the
//! assertion holds for both.

use defuss_semantic_compress::{compress, CompressConfig, CompressResult, SectionMetrics};
use serde::Serialize;
use std::path::{Path, PathBuf};

use crate::assertion::whitespace_normalized;
use crate::fixture::{load_fixtures, EvalFixture};
use crate::provider::{provider_for, ModelParams};

#[derive(Debug, Clone, Default)]
pub struct EvalOptions {
    /// When set, the machine-readable JSON report is written here.
    pub report_path: Option<PathBuf>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EvalFailure {
    pub id: String,
    pub model: String,
    pub details: String,
}

/// Per-fixture report entry (§29 milestone 8): byte metrics and per-section
/// metrics of the compressed run.
#[derive(Debug, Clone, Serialize)]
pub struct FixtureResult {
    pub id: String,
    pub passed: bool,
    pub input_bytes: usize,
    pub output_bytes: usize,
    pub byte_saving: usize,
    pub sections: Vec<SectionMetrics>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EvalReport {
    pub total: usize,
    pub passed: usize,
    pub failures: Vec<EvalFailure>,
    pub results: Vec<FixtureResult>,
}

/// Runs all fixtures in `dir`, prints a human-readable summary, and writes
/// the JSON report when `opts.report_path` is set.
pub fn run_eval(dir: &Path, opts: &EvalOptions) -> EvalReport {
    let fixtures = match load_fixtures(dir) {
        Ok(f) => f,
        Err(e) => {
            let report = EvalReport {
                total: 0,
                passed: 0,
                failures: vec![EvalFailure {
                    id: dir.display().to_string(),
                    model: "-".to_string(),
                    details: e,
                }],
                results: Vec::new(),
            };
            for f in &report.failures {
                println!("FAIL {} [{}]: {}", f.id, f.model, f.details);
            }
            write_report(&report, opts);
            return report;
        }
    };

    let mut report = EvalReport {
        total: 0,
        passed: 0,
        failures: Vec::new(),
        results: Vec::new(),
    };
    for fixture in &fixtures {
        let (failures, compressed) = run_fixture(fixture);
        let passed = failures.is_empty();
        report.total += 1;
        if passed {
            report.passed += 1;
            println!("PASS {}", fixture.id);
        } else {
            for f in &failures {
                println!("FAIL {} [{}]: {}", f.id, f.model, f.details);
            }
            report.failures.extend(failures);
        }
        report.results.push(FixtureResult {
            id: fixture.id.clone(),
            passed,
            input_bytes: compressed
                .as_ref()
                .map(|r| r.metrics.input_bytes)
                .unwrap_or(0),
            output_bytes: compressed
                .as_ref()
                .map(|r| r.metrics.output_bytes)
                .unwrap_or(0),
            byte_saving: compressed
                .as_ref()
                .map(|r| r.metrics.byte_saving())
                .unwrap_or(0),
            sections: compressed
                .map(|r| r.metrics.sections)
                .unwrap_or_default(),
        });
    }
    println!("{}/{} fixtures passed", report.passed, report.total);
    write_report(&report, opts);
    report
}

fn write_report(report: &EvalReport, opts: &EvalOptions) {
    if let Some(path) = &opts.report_path {
        match serde_json::to_string_pretty(report) {
            Ok(json) => {
                if let Err(e) = std::fs::write(path, json) {
                    eprintln!("cannot write report {}: {e}", path.display());
                }
            }
            Err(e) => eprintln!("cannot serialize report: {e}"),
        }
    }
}

/// Runs one fixture across all its models. Returns the failures (empty =
/// pass) and the compressed run's result for per-section report metrics.
fn run_fixture(fixture: &EvalFixture) -> (Vec<EvalFailure>, Option<CompressResult>) {
    let compressed = match compress(&fixture.input, CompressConfig::default()) {
        Ok(r) => r,
        Err(e) => {
            return (
                vec![EvalFailure {
                    id: fixture.id.clone(),
                    model: "-".to_string(),
                    details: format!("compress failed: {e}"),
                }],
                None,
            )
        }
    };

    let params = ModelParams::default();
    let mut failures = Vec::new();
    for model in &fixture.models {
        let fail = |details: String| EvalFailure {
            id: fixture.id.clone(),
            model: model.clone(),
            details,
        };

        let (provider, model_name) = match provider_for(model, fixture.mock_response.clone()) {
            Ok(v) => v,
            Err(e) => {
                failures.push(fail(format!("provider setup failed: {e}")));
                continue;
            }
        };

        let baseline = match provider.complete(&model_name, &fixture.input, &params) {
            Ok(out) => out,
            Err(e) => {
                failures.push(fail(format!("baseline provider error: {e}")));
                continue;
            }
        };
        let compressed_out = match provider.complete(&model_name, &compressed.output, &params) {
            Ok(out) => out,
            Err(e) => {
                failures.push(fail(format!("compressed provider error: {e}")));
                continue;
            }
        };

        if let Err(reason) = fixture.assertion.check(&baseline) {
            failures.push(fail(format!("baseline assertion failed: {reason}")));
        }
        if let Err(reason) = fixture.assertion.check(&compressed_out) {
            failures.push(fail(format!("compressed assertion failed: {reason}")));
        }
        if fixture.strict_equivalence
            && whitespace_normalized(&baseline) != whitespace_normalized(&compressed_out)
        {
            failures.push(fail(format!(
                "strict equivalence failed: baseline {baseline:?} != compressed {compressed_out:?}"
            )));
        }
    }
    (failures, Some(compressed))
}
