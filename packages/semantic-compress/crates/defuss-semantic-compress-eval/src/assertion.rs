//! Assertion types (§29.3). An assertion checks one model output and returns
//! `Ok(())` on pass or `Err(reason)` on fail.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Assertion {
    /// Output must parse to a JSON value equal to `expected`.
    ExactJson { expected: Value },
    /// Output must parse to JSON of which `expected` is a recursive subset
    /// (shape match): every expected object key must exist and match
    /// recursively; arrays must have equal length and match element-wise.
    JsonSchemaMatch { expected: Value },
    /// Output must parse to JSON structurally equal to `expected`.
    ToolCallEquivalence { expected: Value },
    /// `command` must exit 0 (optionally in `cwd`). Output-independent.
    TestsPass {
        command: String,
        #[serde(default)]
        cwd: Option<String>,
    },
    /// All terms must appear in the output (case-insensitive substring).
    ContainsRequiredTerms { terms: Vec<String> },
    /// No term may appear in the output (case-insensitive substring).
    DoesNotContainForbiddenTerms { terms: Vec<String> },
    /// Output must equal `expected` after trimming.
    ClassificationLabelMatch { expected: String },
    /// Output must equal `expected` after whitespace normalization.
    DiffEquivalence { expected: String },
}

impl Assertion {
    /// Checks one model output. Returns `Err(reason)` when it fails.
    pub fn check(&self, output: &str) -> Result<(), String> {
        match self {
            Assertion::ExactJson { expected } => {
                let actual = parse_json(output)?;
                if &actual == expected {
                    Ok(())
                } else {
                    Err(format!("expected {expected}, got {actual}"))
                }
            }
            Assertion::JsonSchemaMatch { expected } => {
                let actual = parse_json(output)?;
                if json_subset(expected, &actual) {
                    Ok(())
                } else {
                    Err(format!("expected shape {expected} not found in {actual}"))
                }
            }
            Assertion::ToolCallEquivalence { expected } => {
                let actual = parse_json(output)?;
                if &actual == expected {
                    Ok(())
                } else {
                    Err(format!("tool call mismatch: expected {expected}, got {actual}"))
                }
            }
            Assertion::TestsPass { command, cwd } => {
                let mut cmd = Command::new("sh");
                cmd.arg("-c").arg(command);
                if let Some(cwd) = cwd {
                    cmd.current_dir(cwd);
                }
                let status = cmd
                    .status()
                    .map_err(|e| format!("cannot run {command:?}: {e}"))?;
                if status.success() {
                    Ok(())
                } else {
                    Err(format!("command {command:?} exited with {status}"))
                }
            }
            Assertion::ContainsRequiredTerms { terms } => {
                let hay = output.to_lowercase();
                let missing: Vec<&str> = terms
                    .iter()
                    .filter(|t| !hay.contains(&t.to_lowercase()))
                    .map(String::as_str)
                    .collect();
                if missing.is_empty() {
                    Ok(())
                } else {
                    Err(format!("missing required terms: {}", missing.join(", ")))
                }
            }
            Assertion::DoesNotContainForbiddenTerms { terms } => {
                let hay = output.to_lowercase();
                let found: Vec<&str> = terms
                    .iter()
                    .filter(|t| hay.contains(&t.to_lowercase()))
                    .map(String::as_str)
                    .collect();
                if found.is_empty() {
                    Ok(())
                } else {
                    Err(format!("forbidden terms present: {}", found.join(", ")))
                }
            }
            Assertion::ClassificationLabelMatch { expected } => {
                if output.trim() == expected.trim() {
                    Ok(())
                } else {
                    Err(format!(
                        "label mismatch: expected {:?}, got {:?}",
                        expected.trim(),
                        output.trim()
                    ))
                }
            }
            Assertion::DiffEquivalence { expected } => {
                if whitespace_normalized(output) == whitespace_normalized(expected) {
                    Ok(())
                } else {
                    Err(format!("outputs differ: expected {expected:?}, got {output:?}"))
                }
            }
        }
    }
}

fn parse_json(output: &str) -> Result<Value, String> {
    serde_json::from_str(output).map_err(|e| format!("output is not valid JSON: {e}"))
}

/// Collapses all whitespace runs to a single space.
pub(crate) fn whitespace_normalized(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Recursive subset match: expected object keys must exist in actual and
/// match recursively; arrays match element-wise with equal length; scalars
/// must be equal.
fn json_subset(expected: &Value, actual: &Value) -> bool {
    match (expected, actual) {
        (Value::Object(e), Value::Object(a)) => e
            .iter()
            .all(|(k, ev)| a.get(k).map(|av| json_subset(ev, av)).unwrap_or(false)),
        (Value::Array(e), Value::Array(a)) => {
            e.len() == a.len() && e.iter().zip(a.iter()).all(|(ev, av)| json_subset(ev, av))
        }
        (e, a) => e == a,
    }
}
