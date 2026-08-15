use std::collections::BTreeMap;
use std::path::Path;

use crate::classify::lexicon::Lexicon;
use crate::error::CompressError;
use crate::parse::token::fold_word;
use crate::rules::schema::*;

/// One loaded language pack.
#[derive(Debug, Clone)]
pub struct RulePack {
    pub lang: String,
    pub lexicon: Lexicon,
    pub bad_words: Vec<String>,
    pub grammar: GrammarRulesJson,
    /// replacements + politeness + paths rules, merged
    pub rules: Vec<RuleJson>,
    pub action_words: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct SharedRules {
    pub markdown: SharedMarkdownJson,
    pub codefence_formats: BTreeMap<String, bool>,
}

#[derive(Debug, Clone)]
pub struct RuleSet {
    pub packs: Vec<RulePack>,
    pub shared: SharedRules,
    /// folded token or token bigram ("i'd" / "i would") -> normalized key ("i_would")
    pub alias_map: BTreeMap<String, String>,
}

const EMBEDDED_LANGS: &[&str] = &["en", "de"];

macro_rules! embedded {
    ($path:literal) => {
        include_str!(concat!("../../../../rules/", $path))
    };
}

fn embedded_file(lang: &str, name: &str) -> Option<&'static str> {
    Some(match (lang, name) {
        ("en", "lexicon.json") => embedded!("en/lexicon.json"),
        ("en", "bad_words.json") => embedded!("en/bad_words.json"),
        ("en", "grammar_rules.json") => embedded!("en/grammar_rules.json"),
        ("en", "replacements.json") => embedded!("en/replacements.json"),
        ("en", "politeness_phrases.json") => embedded!("en/politeness_phrases.json"),
        ("en", "paths.json") => embedded!("en/paths.json"),
        ("de", "lexicon.json") => embedded!("de/lexicon.json"),
        ("de", "bad_words.json") => embedded!("de/bad_words.json"),
        ("de", "grammar_rules.json") => embedded!("de/grammar_rules.json"),
        ("de", "replacements.json") => embedded!("de/replacements.json"),
        ("de", "politeness_phrases.json") => embedded!("de/politeness_phrases.json"),
        ("de", "paths.json") => embedded!("de/paths.json"),
        ("shared", "markdown.json") => embedded!("shared/markdown.json"),
        ("shared", "codefence_formats.json") => embedded!("shared/codefence_formats.json"),
        _ => return None,
    })
}

fn read_pack_file(
    rules_path: Option<&Path>,
    lang: &str,
    name: &str,
) -> Result<String, CompressError> {
    if let Some(base) = rules_path {
        let p = base.join(lang).join(name);
        std::fs::read_to_string(&p).map_err(|e| {
            CompressError::RulesLoad(format!("failed to read {}: {e}", p.display()))
        })
    } else {
        embedded_file(lang, name)
            .map(|s| s.to_string())
            .ok_or_else(|| CompressError::RulesLoad(format!("no embedded rules for {lang}/{name}")))
    }
}

fn parse_json<T: serde::de::DeserializeOwned>(src: &str, what: &str) -> Result<T, CompressError> {
    serde_json::from_str(src).map_err(|e| CompressError::RulesLoad(format!("invalid {what}: {e}")))
}

/// Loads rule packs: from `rules_path` when given, otherwise the embedded
/// defaults. `lang = None` loads every available language (overlay mode).
pub fn load_rules(
    lang: Option<&str>,
    rules_path: Option<&Path>,
) -> Result<RuleSet, CompressError> {
    let langs: Vec<String> = match lang {
        Some(l) => vec![l.to_string()],
        None => {
            if let Some(base) = rules_path {
                let mut found = Vec::new();
                let entries = std::fs::read_dir(base).map_err(|e| {
                    CompressError::RulesLoad(format!(
                        "failed to list rules dir {}: {e}",
                        base.display()
                    ))
                })?;
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if entry.path().is_dir() && name != "shared" {
                        found.push(name);
                    }
                }
                found.sort();
                found
            } else {
                EMBEDDED_LANGS.iter().map(|s| s.to_string()).collect()
            }
        }
    };

    let mut packs = Vec::new();
    for lang in &langs {
        let lexicon: Lexicon =
            parse_json(&read_pack_file(rules_path, lang, "lexicon.json")?, "lexicon.json")?;
        let bad_words: BadWordsJson = parse_json(
            &read_pack_file(rules_path, lang, "bad_words.json")?,
            "bad_words.json",
        )?;
        let grammar: GrammarRulesJson = parse_json(
            &read_pack_file(rules_path, lang, "grammar_rules.json")?,
            "grammar_rules.json",
        )?;
        let replacements: ReplacementsJson = parse_json(
            &read_pack_file(rules_path, lang, "replacements.json")?,
            "replacements.json",
        )?;
        let politeness: PolitenessJson = parse_json(
            &read_pack_file(rules_path, lang, "politeness_phrases.json")?,
            "politeness_phrases.json",
        )?;
        let paths: PathsJson =
            parse_json(&read_pack_file(rules_path, lang, "paths.json")?, "paths.json")?;

        let mut rules = Vec::new();
        rules.extend(replacements.rules);
        rules.extend(politeness.rules);
        rules.extend(paths.rules);

        packs.push(RulePack {
            lang: lang.clone(),
            lexicon,
            bad_words: bad_words.words,
            grammar,
            rules,
            action_words: politeness.action_words,
        });
    }

    let markdown: SharedMarkdownJson = parse_json(
        &read_pack_file(rules_path, "shared", "markdown.json")?,
        "shared/markdown.json",
    )?;
    let codefence: SharedCodefenceFormatsJson = parse_json(
        &read_pack_file(rules_path, "shared", "codefence_formats.json")?,
        "shared/codefence_formats.json",
    )?;

    let alias_map = build_alias_map(&packs);

    Ok(RuleSet {
        packs,
        shared: SharedRules {
            markdown,
            codefence_formats: codefence.formats,
        },
        alias_map,
    })
}

/// Builds normalized aliases from word-only replacement rules (§19):
/// "I would" / "I'd" / "I'd" all normalize to "i_would".
fn build_alias_map(packs: &[RulePack]) -> BTreeMap<String, String> {
    let mut map = BTreeMap::new();
    for pack in packs {
        for rule in &pack.rules {
            if rule.phase != "contractions" {
                continue;
            }
            let words: Vec<String> = rule
                .match_pattern
                .iter()
                .filter_map(|e| e.word.as_ref().map(|w| fold_word(w)))
                .collect();
            let wordish = rule
                .match_pattern
                .iter()
                .all(|e| e.word.is_some() || e.whitespace == Some(true));
            if words.len() < 2 || !wordish {
                continue;
            }
            let key = words.join("_");
            map.insert(words.join(" "), key.clone());
            if let Some(repl) = &rule.replacement {
                map.insert(fold_word(repl), key);
            }
        }
    }
    map
}
