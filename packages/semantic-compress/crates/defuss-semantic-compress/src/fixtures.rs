//! Shared fixture runner for E2E tests (§28.3). Used by the core test suite
//! and the CLI's `test` subcommand.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use crate::{compress, CompressConfig};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct E2eFixture {
    pub id: String,
    #[serde(default)]
    pub lang: Option<String>,
    /// Optional external rules directory, resolved relative to the fixture
    /// directory (used by multilingual-ambiguity fixtures with synthetic
    /// packs).
    #[serde(default)]
    pub rules_path: Option<String>,
    pub input: String,
    pub expected: String,
    #[serde(default)]
    pub min_utf8_saving: Option<usize>,
}

#[derive(Debug, Clone)]
pub struct FixtureFailure {
    pub id: String,
    pub reason: String,
}

/// Runs a single E2E fixture. `fixture_dir` resolves relative `rules_path`.
pub fn run_fixture(fixture: &E2eFixture, fixture_dir: &Path) -> Result<(), String> {
    let rules_path = fixture
        .rules_path
        .as_ref()
        .map(|rel| fixture_dir.join(rel));
    let config = CompressConfig {
        lang: fixture.lang.clone(),
        rules_path,
        ..Default::default()
    };
    let result =
        compress(&fixture.input, config).map_err(|e| format!("compress failed: {e}"))?;
    if result.output != fixture.expected {
        return Err(format!(
            "output mismatch:\n  input:    {:?}\n  expected: {:?}\n  actual:   {:?}",
            fixture.input, fixture.expected, result.output
        ));
    }
    if let Some(min) = fixture.min_utf8_saving {
        let saving = fixture.input.len().saturating_sub(result.output.len());
        if saving < min {
            return Err(format!("utf8 saving {saving} < min {min}"));
        }
    }
    if result.output.len() > fixture.input.len() {
        return Err("output grew".to_string());
    }
    // idempotence
    let twice = compress(
        &result.output,
        CompressConfig {
            lang: fixture.lang.clone(),
            rules_path: fixture
                .rules_path
                .as_ref()
                .map(|rel| fixture_dir.join(rel)),
            ..Default::default()
        },
    )
    .map_err(|e| format!("recompress failed: {e}"))?;
    if twice.output != result.output {
        return Err(format!(
            "not idempotent: {:?} -> {:?} -> {:?}",
            fixture.input, result.output, twice.output
        ));
    }
    Ok(())
}

/// Loads all `*.json` fixtures in `dir` (sorted by file name).
pub fn load_fixtures(dir: &Path) -> Result<Vec<E2eFixture>, String> {
    let mut paths: Vec<PathBuf> = std::fs::read_dir(dir)
        .map_err(|e| format!("cannot read {}: {e}", dir.display()))?
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().map(|e| e == "json").unwrap_or(false))
        .collect();
    paths.sort();
    let mut out = Vec::new();
    for p in paths {
        let src = std::fs::read_to_string(&p)
            .map_err(|e| format!("cannot read {}: {e}", p.display()))?;
        let fixture: E2eFixture = serde_json::from_str(&src)
            .map_err(|e| format!("invalid fixture {}: {e}", p.display()))?;
        out.push(fixture);
    }
    Ok(out)
}

/// Runs all fixtures in a directory; returns (passed, failures).
pub fn run_fixture_dir(dir: &Path) -> (usize, Vec<FixtureFailure>) {
    let fixtures = match load_fixtures(dir) {
        Ok(f) => f,
        Err(e) => {
            return (
                0,
                vec![FixtureFailure {
                    id: dir.display().to_string(),
                    reason: e,
                }],
            )
        }
    };
    let mut passed = 0;
    let mut failures = Vec::new();
    for f in fixtures {
        match run_fixture(&f, dir) {
            Ok(()) => passed += 1,
            Err(reason) => failures.push(FixtureFailure {
                id: f.id.clone(),
                reason,
            }),
        }
    }
    (passed, failures)
}
