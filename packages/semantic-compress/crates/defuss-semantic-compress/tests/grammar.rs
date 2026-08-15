use defuss_semantic_compress::rules::loader::load_rules;
use defuss_semantic_compress::{classify, parse, NodeKind, Tag};

fn classify_en(input: &str) -> defuss_semantic_compress::Asl {
    let rules = load_rules(Some("en"), None, &[]).unwrap();
    let mut asl = parse(input);
    classify::classify(&mut asl, &rules);
    asl
}

fn find_word<'a>(
    asl: &'a defuss_semantic_compress::Asl,
    text: &str,
) -> &'a defuss_semantic_compress::Node {
    asl.nodes
        .iter()
        .find(|n| n.text.as_deref() == Some(text))
        .unwrap_or_else(|| panic!("word {text:?} not found"))
}

#[test]
fn that_complementizer_after_think() {
    // §11.1 / §28.1: "I think that this works." -> that = Complementizer
    let asl = classify_en("I think that this works.");
    let that = find_word(&asl, "that");
    assert_eq!(that.kind, NodeKind::Complementizer);
    assert!(that.meta.tags.contains(&Tag::Complementizer));
    assert!(that.meta.protected);
    // protect_following: "this" in the clause stays unclassified + protected
    let this = find_word(&asl, "this");
    assert_eq!(this.kind, NodeKind::Word);
    assert!(this.meta.protected);
}

#[test]
fn that_complementizer_after_ensure() {
    let asl = classify_en("Ensure that the file exists.");
    let that = find_word(&asl, "that");
    assert_eq!(that.kind, NodeKind::Complementizer);
    let the = find_word(&asl, "the");
    assert!(the.meta.protected);
}

#[test]
fn that_det_in_that_file() {
    // "that file" -> that = Det (§28.1)
    let asl = classify_en("Please fix that file now.");
    let that = find_word(&asl, "that");
    assert_eq!(that.kind, NodeKind::Det);
    assert!(that.meta.tags.contains(&Tag::Det));
    assert!(!that.meta.protected);
}

#[test]
fn the_hague_named_entity() {
    // §11.2: The Hague -> The = NamedEntity
    let asl = classify_en("The Hague is nice.");
    let the = asl
        .nodes
        .iter()
        .find(|n| n.text.as_deref() == Some("The"))
        .unwrap();
    assert_eq!(the.kind, NodeKind::NamedEntity);
    assert!(the.meta.tags.contains(&Tag::NamedEntity));
    assert!(the.meta.protected);
}

#[test]
fn the_bug_stays_det() {
    let asl = classify_en("Please fix the bug now.");
    let the = find_word(&asl, "the");
    assert_eq!(the.kind, NodeKind::Det);
    assert!(!the.meta.protected);
}

#[test]
fn to_infinitive_particle_before_verb() {
    // §11.3: "to build" -> to = InfParticle
    let asl = classify_en("I would like you to build this.");
    let to = find_word(&asl, "to");
    assert_eq!(to.kind, NodeKind::InfParticle);
    assert!(to.meta.tags.contains(&Tag::InfParticle));
}

#[test]
fn to_prep_before_noun() {
    // §11.3: "to Berlin" -> to = Prep
    let asl = classify_en("He went to Berlin.");
    let to = find_word(&asl, "to");
    assert_eq!(to.kind, NodeKind::Prep);
    assert!(to.meta.tags.contains(&Tag::Prep));
}

#[test]
fn negation_sentence_fully_protected() {
    // §28.4: "Please do not delete this." must remain unchanged
    let asl = classify_en("Please do not delete this.");
    let please = find_word(&asl, "Please");
    assert!(please.meta.protected);
    let this = find_word(&asl, "this");
    assert!(this.meta.protected);
    // no lexical classification happens inside protected sentences
    assert_eq!(this.kind, NodeKind::Word);
}

#[test]
fn normalized_alias_on_single_token() {
    // §19: "I'd" normalizes to "i_would"
    let asl = classify_en("I'd like you to build this.");
    let id = asl
        .nodes
        .iter()
        .find(|n| n.text.as_deref() == Some("I'd"))
        .unwrap();
    assert_eq!(id.meta.normalized_text.as_deref(), Some("i_would"));
}
