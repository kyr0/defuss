use std::collections::BTreeMap;
use std::collections::HashMap;

use crate::parse::token::fold_word;

/// The normalized view of a token (§16): folded form plus its normalized
/// alias key (e.g. "i'd" -> "i_would") when one exists.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NormalizedForm {
    pub folded: String,
    pub normalized: Option<String>,
}

/// Caches normalized forms per word so repeated words don't re-normalize
/// (§16.1). Folding is language-independent in v1; the `lang` parameter is
/// accepted for API stability once folding becomes language-aware.
#[derive(Debug)]
pub struct NormalizationCache<'a> {
    alias_map: &'a BTreeMap<String, String>,
    entries: HashMap<String, NormalizedForm>,
    hits: usize,
    misses: usize,
}

impl<'a> NormalizationCache<'a> {
    pub fn new(alias_map: &'a BTreeMap<String, String>) -> Self {
        NormalizationCache {
            alias_map,
            entries: HashMap::new(),
            hits: 0,
            misses: 0,
        }
    }

    pub fn get(&mut self, word: &str, _lang: &str) -> NormalizedForm {
        let folded = fold_word(word);
        if let Some(entry) = self.entries.get(&folded) {
            self.hits += 1;
            return entry.clone();
        }
        self.misses += 1;
        let form = NormalizedForm {
            normalized: self.alias_map.get(&folded).cloned(),
            folded: folded.clone(),
        };
        self.entries.insert(folded, form.clone());
        form
    }

    /// (hits, misses) — used by the §26.1 cache test.
    pub fn stats(&self) -> (usize, usize) {
        (self.hits, self.misses)
    }
}
