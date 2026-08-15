use std::collections::{BTreeMap, BTreeSet};

/// Multi-language lexicon overlay (§10).
///
/// A word that appears in more than one active language pack is omitted from
/// classification entirely — even if all packs assign the same class.
#[derive(Debug, Clone, Default)]
pub struct LexiconOverlay {
    /// folded word -> (class, source language) (unambiguous words only)
    classes: BTreeMap<String, (String, String)>,
    /// words omitted because they appear in multiple packs
    ambiguous: BTreeSet<String>,
}

impl LexiconOverlay {
    /// Builds the overlay from `(language, entries)` pairs, where `entries`
    /// are `(folded_word, class)` pairs of one pack.
    pub fn build(packs: &[(&str, Vec<(String, String)>)]) -> LexiconOverlay {
        // word -> set of languages containing it, plus first class seen
        let mut langs: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
        let mut first_class: BTreeMap<String, String> = BTreeMap::new();
        for (lang, entries) in packs {
            for (word, class) in entries {
                langs
                    .entry(word.clone())
                    .or_default()
                    .insert((*lang).to_string());
                first_class.entry(word.clone()).or_insert_with(|| class.clone());
            }
        }
        let mut classes = BTreeMap::new();
        let mut ambiguous = BTreeSet::new();
        for (word, lang_set) in langs {
            if lang_set.len() > 1 {
                ambiguous.insert(word);
            } else if let Some(class) = first_class.get(&word) {
                let lang = lang_set.iter().next().unwrap().clone();
                classes.insert(word, (class.clone(), lang));
            }
        }
        LexiconOverlay { classes, ambiguous }
    }

    /// (class, source language) for an unambiguous folded word.
    pub fn classify(&self, folded_word: &str) -> Option<(&str, &str)> {
        self.classes
            .get(folded_word)
            .map(|(c, l)| (c.as_str(), l.as_str()))
    }

    pub fn is_ambiguous(&self, folded_word: &str) -> bool {
        self.ambiguous.contains(folded_word)
    }

    pub fn ambiguous_words(&self) -> &BTreeSet<String> {
        &self.ambiguous
    }
}
