use std::fmt;

#[derive(Debug)]
pub enum CompressError {
    RulesLoad(String),
}

impl fmt::Display for CompressError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CompressError::RulesLoad(msg) => write!(f, "failed to load rules: {msg}"),
        }
    }
}

impl std::error::Error for CompressError {}
