use crate::asl::{Asl, NodeId, NodeKind};

/// True when the node is inside a protected context: itself protected, or any
/// ancestor protected (Quote nodes and non-markdown CodeFences are marked
/// protected at parse time).
pub fn is_effectively_protected(asl: &Asl, id: NodeId) -> bool {
    let mut cur = Some(id);
    while let Some(nid) = cur {
        if asl.node(nid).meta.protected {
            return true;
        }
        cur = asl.node(nid).parent;
    }
    false
}

/// All unprotected word-token node ids in document order.
pub fn unprotected_word_nodes(asl: &Asl) -> Vec<NodeId> {
    asl.nodes
        .iter()
        .filter(|n| n.kind == NodeKind::Word && n.text.is_some())
        .filter(|n| !is_effectively_protected(asl, n.id))
        .map(|n| n.id)
        .collect()
}
