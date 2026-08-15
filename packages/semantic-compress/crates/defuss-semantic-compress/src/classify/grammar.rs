use regex::Regex;

use crate::asl::{Asl, NodeId, NodeKind, Tag};
use crate::parse::token::fold_word;
use crate::rules::schema::GrammarRulesJson;

/// Word-like direct children of a sentence, as (child_index, NodeId).
/// Skips Whitespace/Newline; stops at nothing else (Quote nodes are a single
/// child and simply never match word lookups).
fn word_children(asl: &Asl, sentence: NodeId) -> Vec<(usize, NodeId)> {
    asl.node(sentence)
        .children
        .iter()
        .enumerate()
        .filter(|(_, &id)| asl.node(id).kind.is_word_like())
        .map(|(i, &id)| (i, id))
        .collect()
}

fn re_any(patterns: &[String], folded: &str) -> bool {
    patterns.iter().any(|p| {
        Regex::new(&format!("^(?:{p})$"))
            .map(|re| re.is_match(folded))
            .unwrap_or(false)
    })
}

/// Applies context-sensitive classification rules (§11.1: "that" as
/// complementizer). Matching words get re-classified, tagged and protected.
pub fn apply_classify_rules(asl: &mut Asl, grammar: &GrammarRulesJson) {
    // (sentence, word-position) pairs over the whole tree
    let sentences: Vec<NodeId> = super::classify_scopes(asl);

    for rule in &grammar.classify_rules {
        let kind = match NodeKind::from_str(&rule.classify_as) {
            Some(k) => k,
            None => continue,
        };
        let tag = Tag::from_str(&rule.classify_as);
        let target = fold_word(&rule.target);
        for &sid in &sentences {
            let words = word_children(asl, sid);
            for (pos, &(_, nid)) in words.iter().enumerate() {
                let node = asl.node(nid);
                if node.meta.protected {
                    continue;
                }
                let folded = node.text.as_deref().map(fold_word).unwrap_or_default();
                if folded != target {
                    continue;
                }
                let prev_ok = if rule.before.is_empty() {
                    true
                } else {
                    pos > 0 && {
                        let prev = asl.node(words[pos - 1].1);
                        let pf = prev.text.as_deref().map(fold_word).unwrap_or_default();
                        re_any(&rule.before, &pf)
                    }
                };
                let next_ok = if rule.after.is_empty() {
                    true
                } else {
                    pos + 1 < words.len() && {
                        let next = asl.node(words[pos + 1].1);
                        let nf = next.text.as_deref().map(fold_word).unwrap_or_default();
                        re_any(&rule.after, &nf)
                    }
                };
                if prev_ok && next_ok {
                    reclassify(asl, nid, kind, tag, rule.protect, &rule.id);
                    if rule.protect_following {
                        // protect the remainder of the sentence (clause
                        // introduced by e.g. a complementizer)
                        let child_idx = words[pos].0;
                        let children = asl.node(sid).children.clone();
                        for &cid in &children[child_idx..] {
                            protect_subtree(asl, cid);
                        }
                    }
                }
            }
        }
    }
}

/// Protects fixed known named-entity phrases (§11.2). Case-sensitive exact
/// phrase match; no TitleCase guessing in safe mode.
pub fn apply_named_entities(asl: &mut Asl, grammar: &GrammarRulesJson) {
    let phrases: Vec<Vec<String>> = grammar
        .named_entities
        .iter()
        .map(|p| p.split_whitespace().map(|s| s.to_string()).collect())
        .filter(|p: &Vec<String>| !p.is_empty())
        .collect();
    if phrases.is_empty() {
        return;
    }
    let sentences: Vec<NodeId> = super::classify_scopes(asl);
    for &sid in &sentences {
        let words = word_children(asl, sid);
        let mut pos = 0;
        while pos < words.len() {
            let mut matched: Option<&Vec<String>> = None;
            for phrase in &phrases {
                if pos + phrase.len() > words.len() {
                    continue;
                }
                let all_eq = phrase.iter().enumerate().all(|(k, pw)| {
                    asl.node(words[pos + k].1).text.as_deref() == Some(pw.as_str())
                });
                if all_eq {
                    matched = Some(phrase);
                    break;
                }
            }
            if let Some(phrase) = matched {
                let rule_id = format!("grammar.named_entity.{}", grammar.language);
                for k in 0..phrase.len() {
                    reclassify(
                        asl,
                        words[pos + k].1,
                        NodeKind::NamedEntity,
                        Some(Tag::NamedEntity),
                        true,
                        &rule_id,
                    );
                }
                pos += phrase.len();
            } else {
                pos += 1;
            }
        }
    }
}

/// Classifies the particle word (§11.3: "to" -> Prep | InfParticle).
pub fn apply_particle(asl: &mut Asl, grammar: &GrammarRulesJson) {
    let particle = match &grammar.particle_word {
        Some(p) => fold_word(p),
        None => return,
    };
    let verbs: Vec<String> = grammar.infinitive_verbs.iter().map(|v| fold_word(v)).collect();
    let sentences: Vec<NodeId> = super::classify_scopes(asl);
    for &sid in &sentences {
        let words = word_children(asl, sid);
        for (pos, &(_, nid)) in words.iter().enumerate() {
            let node = asl.node(nid);
            if node.meta.protected || node.kind != NodeKind::Word {
                continue;
            }
            let folded = node.text.as_deref().map(fold_word).unwrap_or_default();
            if folded != particle {
                continue;
            }
            let next_word = if pos + 1 < words.len() {
                asl.node(words[pos + 1].1)
                    .text
                    .as_deref()
                    .map(fold_word)
            } else {
                None
            };
            let (kind, tag, rule_suffix) = match next_word {
                Some(nw) if verbs.contains(&nw) => {
                    (NodeKind::InfParticle, Tag::InfParticle, "inf_particle")
                }
                Some(_) => (NodeKind::Prep, Tag::Prep, "prep"),
                None => continue,
            };
            let rule_id = format!("{}.{}.{}", grammar.language, particle, rule_suffix);
            reclassify(asl, nid, kind, Some(tag), false, &rule_id);
        }
    }
}

fn reclassify(
    asl: &mut Asl,
    nid: NodeId,
    kind: NodeKind,
    tag: Option<Tag>,
    protect: bool,
    rule_id: &str,
) {
    let node = asl.node_mut(nid);
    node.kind = kind;
    node.meta.tags.retain(|t| {
        // drop lexical class tags that this reclassification replaces
        !matches!(t, Tag::Det | Tag::Filler)
    });
    if let Some(t) = tag {
        if !node.meta.tags.contains(&t) {
            node.meta.tags.push(t);
        }
    }
    if protect {
        node.meta.protected = true;
    }
    node.meta.classification_rule = Some(rule_id.to_string());
}

fn protect_subtree(asl: &mut Asl, nid: NodeId) {
    asl.node_mut(nid).meta.protected = true;
    let children = asl.node(nid).children.clone();
    for c in children {
        protect_subtree(asl, c);
    }
}

/// Quote safety: any sentence that contains an inline Quote node is fully
/// protected (the sentence discusses exact text; §28.4).
pub fn protect_quoted_sentences(asl: &mut Asl) {
    let scopes = super::classify_scopes(asl);
    for sid in scopes {
        let children = asl.node(sid).children.clone();
        let has_quote = children
            .iter()
            .any(|&cid| asl.node(cid).kind == NodeKind::Quote);
        if has_quote {
            for cid in children {
                protect_subtree(asl, cid);
            }
        }
    }
}

/// Negation safety: sentences containing a negation word ("not", "never",
/// "n't" contractions, ...) are fully protected in safe mode (§28.4).
/// The negation lists of all active packs are UNIONED — protection must err
/// on the safe side, so no ambiguity cancellation applies here.
pub fn protect_negation_sentences(asl: &mut Asl, negation_words: &[String]) {
    use crate::parse::token::fold_word;
    let neg: std::collections::BTreeSet<String> =
        negation_words.iter().map(|w| fold_word(w)).collect();
    let scopes = super::classify_scopes(asl);
    for sid in scopes {
        let children = asl.node(sid).children.clone();
        let has_negation = children.iter().any(|&cid| {
            let n = asl.node(cid);
            if !n.kind.is_word_like() {
                return false;
            }
            let folded = n.text.as_deref().map(fold_word).unwrap_or_default();
            neg.contains(&folded) || folded.contains("n't")
        });
        if has_negation {
            for cid in children {
                protect_subtree(asl, cid);
            }
        }
    }
}
