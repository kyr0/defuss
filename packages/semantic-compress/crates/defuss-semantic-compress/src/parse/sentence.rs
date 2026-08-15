use crate::asl::{Asl, NodeId, NodeKind};

/// Groups the direct token children of `parent` into Sentence nodes.
/// Sentence boundary: a `.`, `!` or `?` Symbol followed by whitespace or
/// end-of-line. Inter-sentence whitespace stays as a direct child of `parent`.
/// Returns the created Sentence ids in order.
pub fn split_sentences(asl: &mut Asl, parent: NodeId) -> Vec<NodeId> {
    let children = asl.node(parent).children.clone();
    if children.is_empty() {
        return Vec::new();
    }

    // Compute sentence ranges [start, end) over the child list.
    let mut ranges: Vec<(usize, usize)> = Vec::new();
    let mut start = 0usize;
    for i in 0..children.len() {
        let node = asl.node(children[i]);
        let is_terminator = node.kind == NodeKind::Symbol
            && matches!(node.text.as_deref(), Some(".") | Some("!") | Some("?"));
        if is_terminator {
            let next_is_boundary = match children.get(i + 1) {
                None => true,
                Some(&n) => {
                    matches!(asl.node(n).kind, NodeKind::Whitespace | NodeKind::Newline)
                }
            };
            if next_is_boundary {
                ranges.push((start, i + 1));
                start = i + 1;
            }
        }
    }
    if start < children.len() {
        ranges.push((start, children.len()));
    }

    // Rebuild the child list: leading/trailing whitespace of each range stays
    // at paragraph level; the core token run becomes a Sentence node.
    let mut new_children: Vec<NodeId> = Vec::new();
    let mut sentence_ids: Vec<NodeId> = Vec::new();
    let mut cursor = 0usize;
    for &(s, e) in &ranges {
        for idx in cursor..s {
            new_children.push(children[idx]);
        }
        let mut begin = s;
        let mut end = e;
        while begin < end
            && matches!(
                asl.node(children[begin]).kind,
                NodeKind::Whitespace | NodeKind::Newline
            )
        {
            begin += 1;
        }
        while end > begin
            && matches!(
                asl.node(children[end - 1]).kind,
                NodeKind::Whitespace | NodeKind::Newline
            )
        {
            end -= 1;
        }
        for idx in s..begin {
            new_children.push(children[idx]);
        }
        if begin < end {
            let sid = asl.group_nodes(NodeKind::Sentence, parent, &children[begin..end]);
            new_children.push(sid);
            sentence_ids.push(sid);
        }
        for idx in end..e {
            new_children.push(children[idx]);
        }
        cursor = e;
    }
    for idx in cursor..children.len() {
        new_children.push(children[idx]);
    }
    asl.node_mut(parent).children = new_children;
    sentence_ids
}
