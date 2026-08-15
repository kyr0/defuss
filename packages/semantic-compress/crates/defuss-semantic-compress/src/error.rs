use std::fmt;

#[derive(Debug)]
pub enum CompressError {
    RulesLoad(String),
    ParseFailed(String),
}

impl fmt::Display for CompressError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CompressError::RulesLoad(msg) => write!(f, "failed to load rules: {msg}"),
            CompressError::ParseFailed(msg) => write!(f, "parse failed: {msg}"),
        }
    }
}

impl std::error::Error for CompressError {}

/// Schema version validation failure (§10.1).
#[derive(Debug, Clone)]
pub struct SchemaVersionError {
    pub expected: String,
    pub actual: String,
}

impl fmt::Display for SchemaVersionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "unsupported rule pack schema version {} (supported: {})",
            self.actual, self.expected
        )
    }
}

impl std::error::Error for SchemaVersionError {}

/// One rule pack validation failure (§26.7).
#[derive(Debug, Clone)]
pub struct ValidationFailure {
    pub rule_id: Option<String>,
    pub reason: String,
}

impl fmt::Display for ValidationFailure {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.rule_id {
            Some(id) => write!(f, "rule {id}: {}", self.reason),
            None => write!(f, "{}", self.reason),
        }
    }
}
