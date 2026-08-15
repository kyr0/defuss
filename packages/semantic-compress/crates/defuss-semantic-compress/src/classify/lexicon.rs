use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use crate::parse::token::fold_word;

/// Per-language word-class lexicon (§9).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lexicon {
    #[serde(default = "default_schema_version")]
    pub schema_version: String,
    pub language: String,
    /// class name -> words (e.g. "det" -> ["the", "a", ...])
    pub classes: BTreeMap<String, Vec<String>>,
}

fn default_schema_version() -> String {
    "1.0".to_string()
}

impl Lexicon {
    /// All (folded word, class) pairs of this lexicon.
    pub fn entries(&self) -> Vec<(String, String)> {
        let mut out = Vec::new();
        for (class, words) in &self.classes {
            for w in words {
                out.push((fold_word(w), class.clone()));
            }
        }
        out
    }
}
