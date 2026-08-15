//! Fixture loading (§29.2). Fixtures are `*.json` files in a directory.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use crate::assertion::Assertion;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvalFixture {
    pub id: String,
    #[serde(default)]
    pub task_type: String,
    pub input: String,
    pub models: Vec<String>,
    #[serde(rename = "assert")]
    pub assertion: Assertion,
    /// Returned verbatim by the mock provider when set (offline testing).
    #[serde(default)]
    pub mock_response: Option<String>,
    /// Additionally require baseline and compressed outputs to be
    /// diff-equivalent (§29.5).
    #[serde(default)]
    pub strict_equivalence: bool,
}

/// Loads all `*.json` fixtures in `dir` (sorted by file name).
pub fn load_fixtures(dir: &Path) -> Result<Vec<EvalFixture>, String> {
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
        let fixture: EvalFixture = serde_json::from_str(&src)
            .map_err(|e| format!("invalid fixture {}: {e}", p.display()))?;
        out.push(fixture);
    }
    Ok(out)
}
