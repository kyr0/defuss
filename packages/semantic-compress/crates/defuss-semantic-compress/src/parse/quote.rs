use crate::asl::{Asl, NodeId, NodeKind};

/// Scans the direct children of each Sentence under `parent` for inline
/// quoted spans (`"..."`, `'...'`, `` `...` ``) and wraps them — including the
/// quote symbols — into protected Quote nodes. Unbalanced quotes are left as
/// plain symbols.
pub fn scan_inline_quotes(asl: &mut Asl, sentence: NodeId) {
    let children = asl.node(sentence).children.clone();
    if children.len() < 2 {
        return;
    }
    let quote_chars = ['"', '\u{201C}', '\u{2018}', '\'', '`'];

    let mut new_children: Vec<NodeId> = Vec::new();
    let mut i = 0usize;
    while i < children.len() {
        let node = asl.node(children[i]);
        let is_open = node.kind == NodeKind::Symbol
            && node
                .text
                .as_deref()
                .map(|t| {
                    let mut ch = t.chars();
                    ch.next().map(|c| quote_chars.contains(&c)).unwrap_or(false) && t.chars().count() == 1
                })
                .unwrap_or(false);
        if !is_open {
            new_children.push(children[i]);
            i += 1;
            continue;
        }
        let open_ch = node.text.as_deref().unwrap().chars().next().unwrap();
        let close_ch = match open_ch {
            '\u{201C}' => '\u{201D}',
            '\u{2018}' => '\u{2019}',
            c => c,
        };
        // find the next matching closing symbol
        let mut close_idx: Option<usize> = None;
        for j in (i + 1)..children.len() {
            let cand = asl.node(children[j]);
            if cand.kind == NodeKind::Symbol
                && cand.text.as_deref().map(|t| t.chars().next()) == Some(Some(close_ch))
                && cand.text.as_deref().map(|t| t.chars().count()) == Some(1)
            {
                close_idx = Some(j);
                break;
            }
        }
        match close_idx {
            // require non-empty content between the quotes
            Some(j) if j > i + 1 => {
                let group: Vec<NodeId> = children[i..=j].to_vec();
                let qid = asl.group_nodes(NodeKind::Quote, sentence, &group);
                {
                    let q = asl.node_mut(qid);
                    q.meta.protected = true;
                    q.meta.tags.push(crate::asl::Tag::Quote);
                    q.meta.attrs.insert(
                        "quote_char".to_string(),
                        open_ch.to_string(),
                    );
                }
                // protect the whole subtree
                for nid in asl.leaves_of(qid) {
                    asl.node_mut(nid).meta.protected = true;
                }
                new_children.push(qid);
                i = j + 1;
            }
            _ => {
                new_children.push(children[i]);
                i += 1;
            }
        }
    }
    asl.node_mut(sentence).children = new_children;
}
