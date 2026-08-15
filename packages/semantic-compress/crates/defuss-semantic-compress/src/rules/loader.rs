use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use crate::classify::lexicon::Lexicon;
use crate::error::{CompressError, SchemaVersionError, ValidationFailure};
use crate::parse::token::fold_word;
use crate::rules::schema::*;

/// Highest rule-pack schema version this binary understands (§10.1).
pub const SUPPORTED_SCHEMA_VERSION: &str = "1.0";

/// Where a rule pack came from (§23).
#[derive(Debug, Clone, PartialEq)]
pub enum RuleSource {
    Builtin,
    Filesystem(PathBuf),
    Remote(String),
}

/// One loaded language pack, with metadata (§23).
#[derive(Debug, Clone)]
pub struct RulePack {
    pub id: String, // "defuss/en/base"
    pub version: String,
    pub schema_version: String,
    pub source: RuleSource,
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

/// Rejects packs whose schema version is newer than `expected` (§10.1).
/// Versions are "major.minor"; a pack is loadable iff
/// `actual <= expected` numerically per component.
pub fn validate_schema_version(expected: &str, actual: &str) -> Result<(), SchemaVersionError> {
    fn parse(v: &str) -> (u32, u32) {
        let mut it = v.split('.');
        let major = it.next().and_then(|s| s.parse().ok()).unwrap_or(0);
        let minor = it.next().and_then(|s| s.parse().ok()).unwrap_or(0);
        (major, minor)
    }
    if parse(actual) > parse(expected) {
        return Err(SchemaVersionError {
            expected: expected.to_string(),
            actual: actual.to_string(),
        });
    }
    Ok(())
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
    pack_dir: Option<&Path>,
    lang: &str,
    name: &str,
) -> Result<String, CompressError> {
    if let Some(dir) = pack_dir {
        let p = dir.join(name);
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

/// `pack_dir`: Some(dir) reads `<dir>/<name>.json`; None uses embedded.
fn load_pack(
    lang: &str,
    pack_dir: Option<&Path>,
    source: RuleSource,
) -> Result<RulePack, CompressError> {
    let lexicon: Lexicon =
        parse_json(&read_pack_file(pack_dir, lang, "lexicon.json")?, "lexicon.json")?;
    let bad_words: BadWordsJson = parse_json(
        &read_pack_file(pack_dir, lang, "bad_words.json")?,
        "bad_words.json",
    )?;
    let grammar: GrammarRulesJson = parse_json(
        &read_pack_file(pack_dir, lang, "grammar_rules.json")?,
        "grammar_rules.json",
    )?;
    let replacements: ReplacementsJson = parse_json(
        &read_pack_file(pack_dir, lang, "replacements.json")?,
        "replacements.json",
    )?;
    let politeness: PolitenessJson = parse_json(
        &read_pack_file(pack_dir, lang, "politeness_phrases.json")?,
        "politeness_phrases.json",
    )?;
    let paths: PathsJson =
        parse_json(&read_pack_file(pack_dir, lang, "paths.json")?, "paths.json")?;

    // §10.1: schema version validation (each file carries schema_version)
    for v in [
        &lexicon.schema_version,
        &bad_words.schema_version,
        &grammar.schema_version,
        &replacements.schema_version,
        &politeness.schema_version,
        &paths.schema_version,
    ] {
        validate_schema_version(SUPPORTED_SCHEMA_VERSION, v)
            .map_err(|e| CompressError::RulesLoad(e.to_string()))?;
    }

    let mut rules = Vec::new();
    rules.extend(replacements.rules);
    rules.extend(politeness.rules);
    rules.extend(paths.rules);

    let pack = RulePack {
        id: format!("defuss/{lang}/base"),
        version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version: lexicon.schema_version.clone(),
        source,
        lang: lang.to_string(),
        lexicon,
        bad_words: bad_words.words,
        grammar,
        rules,
        action_words: politeness.action_words,
    };

    // §26.7: validate the whole pack before it goes live
    validate_rule_pack(&pack).map_err(|failures| {
        CompressError::RulesLoad(format!(
            "rule pack {} failed validation:\n{}",
            pack.id,
            failures
                .iter()
                .map(|f| format!("  - {f}"))
                .collect::<Vec<_>>()
                .join("\n")
        ))
    })?;

    Ok(pack)
}

/// Validates a rule pack (§26.7): duplicate ids, referenced classes,
/// pattern compilation, replacements, confidence range, schema version.
pub fn validate_rule_pack(pack: &RulePack) -> Result<(), Vec<ValidationFailure>> {
    let mut failures = Vec::new();

    if validate_schema_version(SUPPORTED_SCHEMA_VERSION, &pack.schema_version).is_err() {
        failures.push(ValidationFailure {
            rule_id: None,
            reason: format!(
                "schema version {} newer than supported {}",
                pack.schema_version, SUPPORTED_SCHEMA_VERSION
            ),
        });
    }

    let mut seen_ids = std::collections::BTreeSet::new();
    let classes: Vec<&str> = pack.lexicon.classes.keys().map(|s| s.as_str()).collect();
    for rule in &pack.rules {
        if !seen_ids.insert(&rule.id) {
            failures.push(ValidationFailure {
                rule_id: Some(rule.id.clone()),
                reason: "duplicate rule id".to_string(),
            });
        }
        if !(0.0..=1.0).contains(&rule.confidence) {
            failures.push(ValidationFailure {
                rule_id: Some(rule.id.clone()),
                reason: format!("confidence {} out of [0.0, 1.0]", rule.confidence),
            });
        }
        // match-element regexes must compile; referenced classes must exist
        for elem in &rule.match_pattern {
            if let Some(p) = &elem.regex {
                if let Err(e) = regex::Regex::new(p) {
                    failures.push(ValidationFailure {
                        rule_id: Some(rule.id.clone()),
                        reason: format!("match regex {p:?} does not compile: {e}"),
                    });
                }
            }
            if let Some(class) = &elem.class {
                let known = match class.as_str() {
                    // bad words live in bad_words.json, not the lexicon
                    "BadWord" => !pack.bad_words.is_empty(),
                    other => {
                        let key = other.to_lowercase();
                        classes.contains(&key.as_str())
                    }
                };
                if !known {
                    failures.push(ValidationFailure {
                        rule_id: Some(rule.id.clone()),
                        reason: format!("referenced class {class:?} not in lexicon"),
                    });
                }
        }
        }
        if let Some(p) = &rule.regex {
            if let Err(e) = regex::Regex::new(p) {
                failures.push(ValidationFailure {
                    rule_id: Some(rule.id.clone()),
                    reason: format!("regex {p:?} does not compile: {e}"),
                });
            }
        }
        if let Some(repl) = &rule.replacement {
            if std::str::from_utf8(repl.as_bytes()).is_err() {
                failures.push(ValidationFailure {
                    rule_id: Some(rule.id.clone()),
                    reason: "replacement is not valid UTF-8".to_string(),
                });
            }
        }
    }

    // grammar classify rules: targets/patterns sanity
    for rule in &pack.grammar.classify_rules {
        if !(0.0..=1.0).contains(&rule.confidence) {
            failures.push(ValidationFailure {
                rule_id: Some(rule.id.clone()),
                reason: format!("confidence {} out of [0.0, 1.0]", rule.confidence),
            });
        }
        for p in rule.before.iter().chain(rule.after.iter()) {
            if let Err(e) = regex::Regex::new(&format!("^(?:{p})$")) {
                failures.push(ValidationFailure {
                    rule_id: Some(rule.id.clone()),
                    reason: format!("context regex {p:?} does not compile: {e}"),
                });
            }
        }
    }

    if failures.is_empty() {
        Ok(())
    } else {
        Err(failures)
    }
}

/// Loads rule packs (§23 composition):
/// 1. builtin (embedded) or filesystem (`rules_path`) packs
/// 2. `extra_rules` directories, each holding one language pack
///
/// `lang = None` loads every available language (overlay mode).
pub fn load_rules(
    lang: Option<&str>,
    rules_path: Option<&Path>,
    extra_rules: &[PathBuf],
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
        let (pack_dir, source) = match rules_path {
            Some(base) => (
                Some(base.join(lang)),
                RuleSource::Filesystem(base.join(lang)),
            ),
            None => (None, RuleSource::Builtin),
        };
        packs.push(load_pack(lang, pack_dir.as_deref(), source)?);
    }

    // extra rule packs (§23): each extra dir is one language pack
    for extra in extra_rules {
        // the pack's language comes from its lexicon
        let lexicon_src = std::fs::read_to_string(extra.join("lexicon.json")).map_err(|e| {
            CompressError::RulesLoad(format!(
                "extra rules {}: cannot read lexicon.json: {e}",
                extra.display()
            ))
        })?;
        let lexicon: Lexicon = parse_json(&lexicon_src, "extra lexicon.json")?;
        packs.push(load_pack(
            &lexicon.language,
            Some(extra),
            RuleSource::Filesystem(extra.clone()),
        )?);
    }

    let shared_dir = rules_path.map(|base| base.join("shared"));
    let markdown: SharedMarkdownJson = parse_json(
        &read_pack_file(shared_dir.as_deref(), "shared", "markdown.json")?,
        "shared/markdown.json",
    )?;
    let codefence: SharedCodefenceFormatsJson = parse_json(
        &read_pack_file(shared_dir.as_deref(), "shared", "codefence_formats.json")?,
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
