pub mod grammar;
pub mod language;
pub mod lexicon;
pub mod overlay;

use crate::asl::{Asl, NodeId, NodeKind, Tag};
use crate::parse::token::fold_word;
use crate::rules::loader::RuleSet;
use overlay::LexiconOverlay;

/// Word-classification scopes: sentences and heading token lists.
pub(crate) fn classify_scopes(asl: &Asl) -> Vec<NodeId> {
    asl.nodes
        .iter()
        .filter(|n| matches!(n.kind, NodeKind::Sentence | NodeKind::MarkdownHeading))
        .map(|n| n.id)
        .collect()
}

/// Union of all active packs' negation word lists (class "negation").
pub(crate) fn negation_words(rules: &RuleSet) -> Vec<String> {
    let mut out = Vec::new();
    for pack in &rules.packs {
        if let Some(words) = pack.lexicon.classes.get("negation") {
            out.extend(words.iter().cloned());
        }
    }
    out
}

/// Builds the active multi-language overlay (lexicon classes + bad words).
pub fn build_overlay(rules: &RuleSet) -> LexiconOverlay {
    let mut packs: Vec<(&str, Vec<(String, String)>)> = Vec::new();
    for pack in &rules.packs {
        let mut entries: Vec<(String, String)> = pack
            .lexicon
            .entries()
            .into_iter()
            // negation words are protective and unioned, never cancelled
            .filter(|(_, class)| class != "negation")
            .collect();
        for w in &pack.bad_words {
            entries.push((fold_word(w), "bad_word".to_string()));
        }
        packs.push((pack.lang.as_str(), entries));
    }
    LexiconOverlay::build(&packs)
}

/// Phase 1-2 (§17): negation protection, grammar disambiguation (which may
/// protect clause content), then lexicon classification.
pub fn classify(asl: &mut crate::asl::Asl, rules: &RuleSet) {
    // 0. negation sentences are fully protected (§28.4)
    grammar::protect_negation_sentences(asl, &negation_words(rules));

    // 0b. sentences containing inline quotes discuss exact text — the whole
    // sentence stays untouched in safe mode (§28.4: "`the` is a token.")
    grammar::protect_quoted_sentences(asl);

    // 1. grammar disambiguation first: complementizer clauses and named
    // entities become protected before lexical classification assigns
    // removable classes (Det/Filler) to their words.
    for pack in &rules.packs {
        grammar::apply_classify_rules(asl, &pack.grammar);
    }
    for pack in &rules.packs {
        grammar::apply_named_entities(asl, &pack.grammar);
    }
    for pack in &rules.packs {
        grammar::apply_particle(asl, &pack.grammar);
    }

    // 2. lexicon classes (det / filler / bad_word)
    let overlay = build_overlay(rules);

    // 1. lexicon classes (det / filler / bad_word)
    for nid in language::unprotected_word_nodes(asl) {
        let folded = asl
            .node(nid)
            .text
            .as_deref()
            .map(fold_word)
            .unwrap_or_default();
        let (kind, tag) = match overlay.classify(&folded) {
            Some("det") => (NodeKind::Det, Tag::Det),
            Some("filler") => (NodeKind::Filler, Tag::Filler),
            Some("bad_word") => (NodeKind::BadWord, Tag::BadWord),
            _ => continue,
        };
        let node = asl.node_mut(nid);
        node.kind = kind;
        node.meta.tags.push(tag);
        node.meta.classification_rule = Some(format!("lexicon.{tag:?}"));
    }

    // 3. normalized token views (§19): single-token aliases ("i'd" -> "i_would")
    let word_ids: Vec<_> = asl
        .nodes
        .iter()
        .filter(|n| n.kind.is_word_like() && n.text.is_some())
        .map(|n| n.id)
        .collect();
    for nid in word_ids {
        let folded = asl
            .node(nid)
            .text
            .as_deref()
            .map(fold_word)
            .unwrap_or_default();
        if let Some(key) = rules.alias_map.get(&folded) {
            asl.node_mut(nid).meta.normalized_text = Some(key.clone());
        }
    }
}
