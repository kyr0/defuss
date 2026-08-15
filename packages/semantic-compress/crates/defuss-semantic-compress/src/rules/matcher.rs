use regex::Regex;
use std::collections::BTreeMap;

use crate::asl::{Asl, NodeId, NodeKind, Tag};
use crate::classify::language::is_effectively_protected;
use crate::parse::token::fold_word;
use crate::rules::candidate::*;
use crate::rules::schema::{MatchElemJson, RuleJson};
use crate::span::Span;

/// A sequence rule with precompiled pattern regexes.
pub struct CompiledSeqRule {
    pub id: String,
    pub phase: Phase,
    pub kind: CandidateKind,
    pub layer: TransformLayer,
    pub priority: i32,
    pub confidence: f32,
    pub review_on_low_confidence: bool,
    pub requires: Option<crate::rules::schema::RequiresJson>,
    pub elems: Vec<CompiledElem>,
    pub replacement: Option<String>,
    pub guards: crate::rules::schema::GuardsJson,
    pub absorb_leading: Vec<String>,
    pub absorb_trailing: Vec<String>,
    pub anchor: Option<String>,
}

pub struct CompiledElem {
    pub word: Option<String>,
    pub regex: Option<Regex>,
    pub class: Option<Tag>,
    pub normalized: Option<String>,
    pub symbol: Option<String>,
    pub whitespace: bool,
    pub optional: bool,
    pub optional_if_class: Option<Tag>,
}

/// A raw-text regex rule (e.g. path rules).
pub struct CompiledRawRule {
    pub id: String,
    pub phase: Phase,
    pub layer: TransformLayer,
    pub priority: i32,
    pub confidence: f32,
    pub review_on_low_confidence: bool,
    pub requires: Option<crate::rules::schema::RequiresJson>,
    pub regex: Regex,
    pub replacement: String,
    pub guards: crate::rules::schema::GuardsJson,
}

pub fn compile_rule(rule: &RuleJson) -> Result<Option<CompiledSeqRule>, String> {
    if rule.regex.is_some() {
        return Ok(None);
    }
    if rule.match_pattern.is_empty() {
        return Err(format!("rule {} has neither match nor regex", rule.id));
    }
    let phase = Phase::from_str(&rule.phase)
        .ok_or_else(|| format!("rule {}: unknown phase {}", rule.id, rule.phase))?;
    let kind = CandidateKind::from_str(&rule.kind)
        .ok_or_else(|| format!("rule {}: unknown kind {}", rule.id, rule.kind))?;
    let layer = TransformLayer::from_str(&rule.layer)
        .ok_or_else(|| format!("rule {}: unknown layer {}", rule.id, rule.layer))?;
    let mut elems = Vec::new();
    for e in &rule.match_pattern {
        elems.push(compile_elem(e, &rule.id)?);
    }
    Ok(Some(CompiledSeqRule {
        id: rule.id.clone(),
        phase,
        kind,
        layer,
        priority: rule.priority,
        confidence: rule.confidence,
        review_on_low_confidence: rule.review_on_low_confidence,
        requires: rule.requires.clone(),
        elems,
        replacement: rule.replacement.clone(),
        guards: rule.guards.clone(),
        absorb_leading: rule.absorb_leading_symbols.clone(),
        absorb_trailing: rule.absorb_trailing_symbols.clone(),
        anchor: rule.anchor.clone(),
    }))
}

pub fn compile_raw_rule(rule: &RuleJson) -> Result<Option<CompiledRawRule>, String> {
    let pattern = match &rule.regex {
        Some(r) => r.clone(),
        None => return Ok(None),
    };
    let phase = Phase::from_str(&rule.phase)
        .ok_or_else(|| format!("rule {}: unknown phase {}", rule.id, rule.phase))?;
    let layer = TransformLayer::from_str(&rule.layer)
        .ok_or_else(|| format!("rule {}: unknown layer {}", rule.id, rule.layer))?;
    let regex =
        Regex::new(&pattern).map_err(|e| format!("rule {}: invalid regex: {e}", rule.id))?;
    Ok(Some(CompiledRawRule {
        id: rule.id.clone(),
        phase,
        layer,
        priority: rule.priority,
        confidence: rule.confidence,
        review_on_low_confidence: rule.review_on_low_confidence,
        requires: rule.requires.clone(),
        regex,
        replacement: rule.replacement.clone().unwrap_or_default(),
        guards: rule.guards.clone(),
    }))
}

fn compile_elem(e: &MatchElemJson, rule_id: &str) -> Result<CompiledElem, String> {
    let regex = match &e.regex {
        Some(p) => Some(
            Regex::new(p).map_err(|err| format!("rule {rule_id}: invalid elem regex: {err}"))?,
        ),
        None => None,
    };
    Ok(CompiledElem {
        word: e.word.as_ref().map(|w| fold_word(w)),
        regex,
        class: e.class.as_ref().and_then(|c| Tag::from_str(c)),
        normalized: e.normalized.clone(),
        symbol: e.symbol.clone(),
        whitespace: e.whitespace.unwrap_or(false),
        optional: e.optional.unwrap_or(false),
        optional_if_class: e
            .optional_if_class
            .as_ref()
            .and_then(|c| Tag::from_str(c)),
    })
}

pub struct MatchContext<'a> {
    pub input: &'a str,
    pub alias_map: &'a BTreeMap<String, String>,
    pub action_words: Vec<String>,
    /// Normalization cache (§16.1): folded/alias lookup per word.
    pub cache: std::cell::RefCell<crate::classify::normalize::NormalizationCache<'a>>,
}

impl<'a> MatchContext<'a> {
    pub fn new(
        input: &'a str,
        alias_map: &'a BTreeMap<String, String>,
        action_words: Vec<String>,
    ) -> Self {
        MatchContext {
            input,
            alias_map,
            action_words,
            cache: std::cell::RefCell::new(
                crate::classify::normalize::NormalizationCache::new(alias_map),
            ),
        }
    }

    /// Fold a word via the normalization cache.
    pub fn fold(&self, word: &str) -> String {
        self.cache.borrow_mut().get(word, "").folded
    }
}

/// Scopes for sequence matching: sentences and heading token lists.
pub fn match_scopes(asl: &Asl) -> Vec<NodeId> {
    asl.nodes
        .iter()
        .filter(|n| matches!(n.kind, NodeKind::Sentence | NodeKind::MarkdownHeading))
        .map(|n| n.id)
        .collect()
}

fn is_ws(asl: &Asl, id: NodeId) -> bool {
    matches!(
        asl.node(id).kind,
        NodeKind::Whitespace | NodeKind::Newline
    )
}

/// Attempts to match `rule` at `tokens[start]`. Returns the end index
/// (exclusive) in `tokens` on success.
fn match_seq_at(
    asl: &Asl,
    ctx: &MatchContext,
    rule: &CompiledSeqRule,
    tokens: &[NodeId],
    start: usize,
) -> Option<usize> {
    let mut cursor = start;
    let mut matched_any = false;
    let mut elem_idx = 0;
    while elem_idx < rule.elems.len() {
        let elem = &rule.elems[elem_idx];
        // between elements, skip whitespace unless the element wants it
        if !elem.whitespace {
            while cursor < tokens.len() && is_ws(asl, tokens[cursor]) {
                cursor += 1;
            }
        }
        if cursor >= tokens.len() {
            if elem.optional || elem.optional_if_class.is_some() {
                elem_idx += 1;
                continue;
            }
            return None;
        }
        let node = asl.node(tokens[cursor]);
        let consumed = match_elem(asl, ctx, elem, tokens, cursor);
        match consumed {
            Some(next) => {
                cursor = next;
                matched_any = true;
            }
            None => {
                if elem.optional {
                    // try to consume optionally; on failure skip element
                    elem_idx += 1;
                    continue;
                }
                if let Some(cls) = elem.optional_if_class {
                    // consume only when word matches AND carries the class
                    let is_word = elem
                        .word
                        .as_ref()
                        .map(|w| {
                            node.kind.is_word_like()
                                && node
                                    .text
                                    .as_deref()
                                    .map(|t| ctx.fold(t))
                                    .as_deref()
                                    == Some(w.as_str())
                        })
                        .unwrap_or(false);
                    if is_word && node.meta.tags.contains(&cls) {
                        cursor += 1;
                        matched_any = true;
                    }
                    // optional either way
                    elem_idx += 1;
                    continue;
                }
                return None;
            }
        }
        elem_idx += 1;
    }
    if matched_any && cursor > start {
        Some(cursor)
    } else {
        None
    }
}

/// Matches one element at `tokens[cursor]`; returns the new cursor.
fn match_elem(
    asl: &Asl,
    ctx: &MatchContext,
    elem: &CompiledElem,
    tokens: &[NodeId],
    cursor: usize,
) -> Option<usize> {
    let node = asl.node(tokens[cursor]);
    if elem.whitespace {
        return if node.kind == NodeKind::Whitespace {
            Some(cursor + 1)
        } else {
            None
        };
    }
    if let Some(sym) = &elem.symbol {
        return if node.kind == NodeKind::Symbol && node.text.as_deref() == Some(sym.as_str()) {
            Some(cursor + 1)
        } else {
            None
        };
    }
    if let Some(w) = &elem.word {
        if node.kind.is_word_like()
            && node
                .text
                .as_deref()
                .map(|t| ctx.fold(t))
                .as_deref()
                == Some(w.as_str())
        {
            return Some(cursor + 1);
        }
        return None;
    }
    if let Some(re) = &elem.regex {
        if (node.kind.is_word_like() || node.kind == NodeKind::Symbol)
            && node.text.as_deref().map(|t| re.is_match(t)).unwrap_or(false)
        {
            return Some(cursor + 1);
        }
        return None;
    }
    if let Some(tag) = &elem.class {
        if node.meta.tags.contains(tag) {
            return Some(cursor + 1);
        }
        return None;
    }
    if let Some(key) = &elem.normalized {
        // single-token alias ("I'd" -> "i_would")
        if node.meta.normalized_text.as_deref() == Some(key.as_str()) {
            return Some(cursor + 1);
        }
        // two-word alias ("I would" -> "i_would")
        if node.kind.is_word_like() {
            let mut next = cursor + 1;
            while next < tokens.len() && is_ws(asl, tokens[next]) {
                next += 1;
            }
            if next < tokens.len() {
                let n2 = asl.node(tokens[next]);
                if n2.kind.is_word_like() {
                    let bigram = format!(
                        "{} {}",
                        node.text.as_deref().map(|t| ctx.fold(t)).unwrap_or_default(),
                        n2.text.as_deref().map(|t| ctx.fold(t)).unwrap_or_default()
                    );
                    if ctx.alias_map.get(&bigram).map(|s| s.as_str()) == Some(key.as_str()) {
                        return Some(next + 1);
                    }
                }
            }
        }
        return None;
    }
    None
}

/// Generates candidates for one compiled sequence rule over the whole tree.
pub fn generate_seq_candidates(
    asl: &Asl,
    ctx: &MatchContext,
    rule: &CompiledSeqRule,
) -> Vec<Candidate> {
    let mut out = Vec::new();
    for scope in match_scopes(asl) {
        let tokens = asl.node(scope).children.clone();
        for start in 0..tokens.len() {
            if is_ws(asl, tokens[start]) {
                continue;
            }
            let end = match match_seq_at(asl, ctx, rule, &tokens, start) {
                Some(e) => e,
                None => continue,
            };
            // anchor checks
            if rule.anchor.as_deref() == Some("start")
                && !tokens[..start].iter().all(|&t| is_ws(asl, t))
            {
                continue;
            }
            if rule.anchor.as_deref() == Some("end") {
                let rest: Vec<NodeId> = tokens[end..].to_vec();
                let mut ok = rest.iter().all(|&t| is_ws(asl, t));
                if !ok {
                    // allow a single trailing "." symbol
                    let non_ws: Vec<NodeId> =
                        rest.iter().copied().filter(|&t| !is_ws(asl, t)).collect();
                    if non_ws.len() == 1 {
                        let n = asl.node(non_ws[0]);
                        ok = n.kind == NodeKind::Symbol && n.text.as_deref() == Some(".");
                    }
                }
                if !ok {
                    continue;
                }
            }

            let mut span = Span::new(asl.node(tokens[start]).span.start, asl.node(tokens[end - 1]).span.end);

            // absorb leading symbol (e.g. "," before a polite suffix)
            if !rule.absorb_leading.is_empty() {
                let mut idx = start;
                while idx > 0 && is_ws(asl, tokens[idx - 1]) {
                    idx -= 1;
                }
                if idx > 0 {
                    let prev = asl.node(tokens[idx - 1]);
                    if prev.kind == NodeKind::Symbol
                        && rule
                            .absorb_leading
                            .contains(&prev.text.clone().unwrap_or_default())
                    {
                        span.start = prev.span.start;
                    }
                }
            }
            // absorb trailing symbol
            if !rule.absorb_trailing.is_empty() {
                let mut idx = end;
                while idx < tokens.len() && is_ws(asl, tokens[idx]) {
                    idx += 1;
                }
                if idx < tokens.len() {
                    let next = asl.node(tokens[idx]);
                    if next.kind == NodeKind::Symbol
                        && rule
                            .absorb_trailing
                            .contains(&next.text.clone().unwrap_or_default())
                    {
                        span.end = next.span.end;
                    }
                }
            }

            let target_nodes: Vec<NodeId> = tokens[start..end]
                .iter()
                .copied()
                .filter(|&t| {
                    let s = asl.node(t).span;
                    s.start >= span.start && s.end <= span.end
                })
                .collect();

            if let Some(cand) = finalize_candidate(asl, ctx, rule, span, target_nodes) {
                out.push(cand);
            }
        }
    }
    out
}

fn finalize_candidate(
    asl: &Asl,
    ctx: &MatchContext,
    rule: &CompiledSeqRule,
    span: Span,
    target_nodes: Vec<NodeId>,
) -> Option<Candidate> {
    if target_nodes.is_empty() {
        return None;
    }
    let first = target_nodes[0];

    // protection: no target may be effectively protected
    if target_nodes.iter().any(|&n| is_effectively_protected(asl, n)) {
        return None;
    }
    if asl.intersects_protected(&span) {
        return None;
    }

    // ancestor guards ("CodeFence" forbidden only for non-markdown fences:
    // §21.1 exception — CodeFence(markdown) content is transformable prose)
    let ancestors = asl.ancestors(first);
    for fa in &rule.guards.forbidden_ancestors {
        if let Some(kind) = NodeKind::from_str(fa) {
            let hit = ancestors.iter().any(|&a| {
                let an = asl.node(a);
                if an.kind != kind {
                    return false;
                }
                if kind == NodeKind::CodeFence {
                    let pre = an
                        .meta
                        .attrs
                        .get("preamble")
                        .map(|s| s.as_str())
                        .unwrap_or("");
                    return !matches!(pre, "markdown" | "md");
                }
                true
            });
            if hit {
                return None;
            }
        }
    }
    for ra in &rule.guards.required_ancestors {
        if let Some(kind) = NodeKind::from_str(ra) {
            if !ancestors.iter().any(|&a| asl.node(a).kind == kind) {
                return None;
            }
        }
    }

    // tag guards
    for ft in &rule.guards.forbidden_tags {
        if let Some(tag) = Tag::from_str(ft) {
            if target_nodes.iter().any(|&n| asl.node(n).meta.tags.contains(&tag)) {
                return None;
            }
        }
    }
    for rt in &rule.guards.required_tags {
        if let Some(tag) = Tag::from_str(rt) {
            if !target_nodes
                .iter()
                .all(|&n| asl.node(n).meta.tags.contains(&tag))
            {
                return None;
            }
        }
    }

    // utf8 saving
    let span_len = span.len();
    let repl_len = rule.replacement.as_deref().map(|r| r.len()).unwrap_or(0);
    if rule.guards.requires_utf8_saving && span_len <= repl_len {
        return None;
    }
    if let Some(min) = rule.guards.min_utf8_saving {
        if span_len.saturating_sub(repl_len) < min {
            return None;
        }
    }

    // non-empty sentence guard
    if rule.guards.requires_non_empty_sentence {
        if let Some(sid) = asl.enclosing_sentence(first) {
            let words_left = asl
                .node(sid)
                .children
                .iter()
                .filter(|&&c| asl.node(c).kind.is_word_like())
                .filter(|&&c| !target_nodes.contains(&c))
                .count();
            if words_left == 0 {
                return None;
            }
        }
    }

    // following action word guard: the next content word after the match
    // (skipping determiners/fillers, same sentence only) must be an action word
    if rule.guards.requires_following_action_word {
        let sentence = asl.enclosing_sentence(first);
        let sentence_end = sentence
            .map(|s| asl.node(s).span.end)
            .unwrap_or(usize::MAX);
        let after_end = span.end;
        let mut following: Vec<_> = asl
            .nodes
            .iter()
            .filter(|n| {
                n.kind.is_word_like()
                    && n.span.start >= after_end
                    && n.span.end <= sentence_end
            })
            .filter(|n| !is_effectively_protected(asl, n.id))
            .collect();
        following.sort_by_key(|n| n.span.start);
        let mut ok = false;
        for node in following.into_iter().take(4) {
            // skip removable function words ("Please simply fix", "Bitte den Fehler reparieren")
            if node.meta.tags.contains(&Tag::Det) || node.meta.tags.contains(&Tag::Filler) {
                continue;
            }
            ok = node
                .text
                .as_deref()
                .map(|t| ctx.fold(t))
                .map(|w| ctx.action_words.contains(&w))
                .unwrap_or(false);
            break;
        }
        if !ok {
            return None;
        }
    }

    // never cover an entire paragraph / list item (§23)
    if let Some(block) = asl.enclosing_of_kinds(
        first,
        &[NodeKind::Paragraph, NodeKind::MarkdownListItem],
    ) {
        let block_words: Vec<NodeId> = asl
            .leaves_of(block)
            .into_iter()
            .filter(|&c| asl.node(c).kind.is_word_like())
            .collect();
        if !block_words.is_empty()
            && block_words
                .iter()
                .all(|&w| span.contains(asl.node(w).span.start) && asl.node(w).span.end <= span.end)
        {
            return None;
        }
    }

    // preconditions (§10.2)
    if let Some(req) = &rule.requires {
        if req.has_sentence_parent && asl.enclosing_sentence(first).is_none() {
            return None;
        }
        if let Some(lang) = &req.language {
            let all_from_lang = target_nodes
                .iter()
                .filter(|&&n| asl.node(n).kind.is_word_like())
                .all(|&n| asl.node(n).meta.lang.as_deref() == Some(lang.as_str()));
            if !all_from_lang {
                return None;
            }
        }
        if let Some(max_ratio) = req.max_removal_ratio {
            if let Some(sid) = asl.enclosing_sentence(first) {
                let sentence_words: Vec<NodeId> = asl
                    .node(sid)
                    .children
                    .iter()
                    .copied()
                    .filter(|&c| asl.node(c).kind.is_word_like())
                    .collect();
                if !sentence_words.is_empty() {
                    let removed = sentence_words
                        .iter()
                        .filter(|w| target_nodes.contains(w))
                        .count();
                    if removed as f32 / sentence_words.len() as f32 > max_ratio {
                        return None;
                    }
                }
            }
        }
    }

    Some(Candidate {
        id: 0, // assigned by the pipeline
        rule_id: rule.id.clone(),
        phase: rule.phase,
        priority: rule.priority,
        layer: rule.layer,
        target_nodes,
        target_span: span,
        kind: rule.kind,
        replacement: rule.replacement.clone(),
        safety: SafetyClass::Safe,
        requires_sibling_edit: false,
            allowed_in_protected: false,
            confidence: rule.confidence,
            review_on_low_confidence: rule.review_on_low_confidence,
    })
}

/// Generates candidates for raw regex rules (path rules), skipping matches
/// that intersect protected spans.
pub fn generate_raw_candidates(
    asl: &Asl,
    ctx: &MatchContext,
    rule: &CompiledRawRule,
) -> Vec<Candidate> {
    let mut out = Vec::new();
    for m in rule.regex.find_iter(ctx.input) {
        let span = Span::new(m.start(), m.end());
        if asl.intersects_protected(&span) {
            continue;
        }
        if rule.guards.requires_utf8_saving && span.len() <= rule.replacement.len() {
            continue;
        }
        if let Some(min) = rule.guards.min_utf8_saving {
            if span.len().saturating_sub(rule.replacement.len()) < min {
                continue;
            }
        }
        out.push(Candidate {
            id: 0,
            rule_id: rule.id.clone(),
            phase: rule.phase,
            priority: rule.priority,
            layer: rule.layer,
            target_nodes: Vec::new(),
            target_span: span,
            kind: CandidateKind::Replace,
            replacement: Some(rule.replacement.clone()),
            safety: SafetyClass::Safe,
            requires_sibling_edit: false,
            allowed_in_protected: false,
            confidence: rule.confidence,
            review_on_low_confidence: rule.review_on_low_confidence,
        });
    }
    out
}
