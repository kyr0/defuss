use defuss_semantic_compress::classify::lexicon::Lexicon;
use defuss_semantic_compress::classify::overlay::LexiconOverlay;
use defuss_semantic_compress::parse::token::fold_word;
use defuss_semantic_compress::rules::loader::load_rules;
use defuss_semantic_compress::{classify, parse, NodeKind, Tag};
use std::collections::BTreeMap;

fn lexicon(lang: &str, det: &[&str], filler: &[&str]) -> Lexicon {
    let mut classes = BTreeMap::new();
    classes.insert(
        "det".to_string(),
        det.iter().map(|s| s.to_string()).collect(),
    );
    classes.insert(
        "filler".to_string(),
        filler.iter().map(|s| s.to_string()).collect(),
    );
    Lexicon {
        language: lang.to_string(),
        classes,
    }
}

#[test]
fn word_in_one_language_is_classified() {
    let en = lexicon("en", &["the"], &["just"]);
    let overlay = LexiconOverlay::build(&[("en", en.entries())]);
    assert_eq!(overlay.classify("the"), Some("det"));
    assert_eq!(overlay.classify("just"), Some("filler"));
    assert_eq!(overlay.classify("unrelated"), None);
}

#[test]
fn word_in_two_languages_is_omitted() {
    // §10: "die" appears in English/German context => not classified
    let en = lexicon("en", &["die"], &[]);
    let de = lexicon("de", &["die"], &[]);
    let overlay = LexiconOverlay::build(&[("en", en.entries()), ("de", de.entries())]);
    assert_eq!(overlay.classify("die"), None);
    assert!(overlay.is_ambiguous("die"));
}

#[test]
fn word_in_two_languages_same_class_still_omitted() {
    // even if both languages assign the same class (§10)
    let en = lexicon("en", &[], &["nur"]);
    let de = lexicon("de", &[], &["nur"]);
    let overlay = LexiconOverlay::build(&[("en", en.entries()), ("de", de.entries())]);
    assert_eq!(overlay.classify("nur"), None);
    assert!(overlay.is_ambiguous("nur"));
}

#[test]
fn casefold_works() {
    let en = lexicon("en", &["The"], &[]);
    let overlay = LexiconOverlay::build(&[("en", en.entries())]);
    assert_eq!(overlay.classify(&fold_word("THE")), Some("det"));
    assert_eq!(overlay.classify(&fold_word("The")), Some("det"));
    assert_eq!(overlay.classify(&fold_word("the")), Some("det"));
}

#[test]
fn shipped_en_de_packs_have_no_ambiguous_lexicon_words() {
    // the bundled packs are designed disjoint; overlay must keep them all
    let rules = load_rules(None, None).unwrap();
    let overlay = classify::build_overlay(&rules);
    assert!(
        overlay.ambiguous_words().is_empty(),
        "unexpected ambiguous words: {:?}",
        overlay.ambiguous_words()
    );
    assert_eq!(overlay.classify("the"), Some("det"));
    assert_eq!(overlay.classify("der"), Some("det"));
}

#[test]
fn classification_assigns_kinds_and_tags() {
    let rules = load_rules(Some("en"), None).unwrap();
    let mut asl = parse("the bug is basically fixed.");
    classify::classify(&mut asl, &rules);
    let the = asl
        .nodes
        .iter()
        .find(|n| n.text.as_deref() == Some("the"))
        .unwrap();
    assert_eq!(the.kind, NodeKind::Det);
    assert!(the.meta.tags.contains(&Tag::Det));
    let basically = asl
        .nodes
        .iter()
        .find(|n| n.text.as_deref() == Some("basically"))
        .unwrap();
    assert_eq!(basically.kind, NodeKind::Filler);
    assert!(basically.meta.tags.contains(&Tag::Filler));
}

#[test]
fn classification_skips_quotes() {
    let rules = load_rules(Some("en"), None).unwrap();
    let mut asl = parse("\"the\" is a word.\n");
    classify::classify(&mut asl, &rules);
    let the = asl
        .nodes
        .iter()
        .find(|n| n.text.as_deref() == Some("the"))
        .unwrap();
    // inside quotes: no lexical classification, stays Word and protected
    assert_eq!(the.kind, NodeKind::Word);
    assert!(the.meta.protected);
}
