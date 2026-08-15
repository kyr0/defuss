use crate::asl::{Asl, NodeId};

/// Renders an ASL tree back to text by concatenating leaf texts in tree
/// order. For a freshly parsed tree this is the identity function.
pub fn render(asl: &Asl) -> String {
    let mut out = String::new();
    render_node(asl, asl.root, &mut out);
    out
}

fn render_node(asl: &Asl, id: NodeId, out: &mut String) {
    let node = asl.node(id);
    if let Some(text) = &node.text {
        out.push_str(text);
        return;
    }
    for &child in &node.children {
        render_node(asl, child, out);
    }
}
