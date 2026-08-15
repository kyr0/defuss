use crate::config::ParserMode;
use crate::span::Span;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub type NodeId = u32;

/// Abstract Semantic Layout: a lossless tree over the original input.
///
/// Invariant: `render(parse(input)) == input`.
/// Leaf nodes carry the exact source text; internal nodes structure it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Asl {
    pub root: NodeId,
    pub nodes: Vec<Node>,
    /// Parser protection mode in effect for this tree (§5.2). Not part of
    /// the serialized form; set at parse time.
    #[serde(skip)]
    pub protection: ParserMode,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Node {
    pub id: NodeId,
    pub kind: NodeKind,
    pub span: Span,
    pub children: Vec<NodeId>,
    /// Exact source text for leaf nodes; `None` for internal nodes.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(default)]
    pub meta: NodeMeta,
    /// Parent link, assigned during parsing. `None` only for the root.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<NodeId>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeKind {
    Root,

    Paragraph,
    Sentence,

    Word,
    Symbol,
    Whitespace,
    Newline,

    Quote,

    CodeFence,
    CodeFencePreamble,
    CodeFenceBody,
    CodeFenceClosing,

    MarkdownHeading,
    MarkdownList,
    MarkdownListItem,
    MarkdownTable,
    MarkdownTableRow,
    MarkdownTableCell,

    Det,
    Filler,
    Politeness,
    BadWord,

    Complementizer,
    NamedEntity,
    Prep,
    InfParticle,

    Json,
    Css,
    Html,
    Markdown,

    Unknown,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct NodeMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lang: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<Tag>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub attrs: BTreeMap<String, String>,

    #[serde(default)]
    pub protected: bool,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub normalized_text: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub classification_rule: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Tag {
    Det,
    Filler,

    Quote,
    CodeFence,

    NamedEntity,
    Complementizer,

    Prep,
    InfParticle,

    PolitePrefix,
    PoliteSuffix,

    BadWord,
}

impl Tag {
    pub fn from_str(s: &str) -> Option<Tag> {
        Some(match s {
            "Det" => Tag::Det,
            "Filler" => Tag::Filler,
            "Quote" => Tag::Quote,
            "CodeFence" => Tag::CodeFence,
            "NamedEntity" => Tag::NamedEntity,
            "Complementizer" => Tag::Complementizer,
            "Prep" => Tag::Prep,
            "InfParticle" => Tag::InfParticle,
            "PolitePrefix" => Tag::PolitePrefix,
            "PoliteSuffix" => Tag::PoliteSuffix,
            "BadWord" => Tag::BadWord,
            _ => return None,
        })
    }
}

impl NodeKind {
    pub fn from_str(s: &str) -> Option<NodeKind> {
        use NodeKind::*;
        Some(match s {
            "Root" => Root,
            "Paragraph" => Paragraph,
            "Sentence" => Sentence,
            "Word" => Word,
            "Symbol" => Symbol,
            "Whitespace" => Whitespace,
            "Newline" => Newline,
            "Quote" => Quote,
            "CodeFence" => CodeFence,
            "CodeFencePreamble" => CodeFencePreamble,
            "CodeFenceBody" => CodeFenceBody,
            "CodeFenceClosing" => CodeFenceClosing,
            "MarkdownHeading" => MarkdownHeading,
            "MarkdownList" => MarkdownList,
            "MarkdownListItem" => MarkdownListItem,
            "MarkdownTable" => MarkdownTable,
            "MarkdownTableRow" => MarkdownTableRow,
            "MarkdownTableCell" => MarkdownTableCell,
            "Det" => Det,
            "Filler" => Filler,
            "Politeness" => Politeness,
            "BadWord" => BadWord,
            "Complementizer" => Complementizer,
            "NamedEntity" => NamedEntity,
            "Prep" => Prep,
            "InfParticle" => InfParticle,
            "Json" => Json,
            "Css" => Css,
            "Html" => Html,
            "Markdown" => Markdown,
            "Unknown" => Unknown,
            _ => return None,
        })
    }

    /// Word-like leaf kinds (tokens that carry natural-language content).
    pub fn is_word_like(&self) -> bool {
        use NodeKind::*;
        matches!(
            self,
            Word | Det | Filler | Complementizer | NamedEntity | Prep | InfParticle | BadWord
        )
    }
}

impl Asl {
    pub fn new() -> Asl {
        Asl::with_protection(ParserMode::default())
    }

    pub fn with_protection(protection: ParserMode) -> Asl {
        let root = Node {
            id: 0,
            kind: NodeKind::Root,
            span: Span::new(0, 0),
            children: Vec::new(),
            text: None,
            meta: NodeMeta::default(),
            parent: None,
        };
        Asl {
            root: 0,
            nodes: vec![root],
            protection,
        }
    }

    pub fn node(&self, id: NodeId) -> &Node {
        &self.nodes[id as usize]
    }

    pub fn node_mut(&mut self, id: NodeId) -> &mut Node {
        &mut self.nodes[id as usize]
    }

    pub fn add_node(
        &mut self,
        kind: NodeKind,
        span: Span,
        parent: NodeId,
        text: Option<String>,
    ) -> NodeId {
        let id = self.nodes.len() as NodeId;
        self.nodes.push(Node {
            id,
            kind,
            span,
            children: Vec::new(),
            text,
            meta: NodeMeta::default(),
            parent: Some(parent),
        });
        self.nodes[parent as usize].children.push(id);
        id
    }

    /// Creates a new node of `kind` adopting `group` (in order) as children.
    /// The caller is responsible for inserting the returned id into the
    /// parent's child list (this function only reparents the group members).
    pub fn group_nodes(&mut self, kind: NodeKind, parent: NodeId, group: &[NodeId]) -> NodeId {
        debug_assert!(!group.is_empty());
        let span = Span::new(
            self.nodes[group[0] as usize].span.start,
            self.nodes[*group.last().unwrap() as usize].span.end,
        );
        let id = self.nodes.len() as NodeId;
        self.nodes.push(Node {
            id,
            kind,
            span,
            children: group.to_vec(),
            text: None,
            meta: NodeMeta::default(),
            parent: Some(parent),
        });
        for child in group {
            self.nodes[*child as usize].parent = Some(id);
        }
        id
    }

    /// All ancestors of `id`, nearest first (excluding `id` itself).
    pub fn ancestors(&self, id: NodeId) -> Vec<NodeId> {
        let mut out = Vec::new();
        let mut cur = self.nodes[id as usize].parent;
        while let Some(p) = cur {
            out.push(p);
            cur = self.nodes[p as usize].parent;
        }
        out
    }

    pub fn has_ancestor_kind(&self, id: NodeId, kind: NodeKind) -> bool {
        let mut cur = self.nodes[id as usize].parent;
        while let Some(p) = cur {
            if self.nodes[p as usize].kind == kind {
                return true;
            }
            cur = self.nodes[p as usize].parent;
        }
        false
    }

    /// The enclosing Sentence node of `id`, if any.
    pub fn enclosing_sentence(&self, id: NodeId) -> Option<NodeId> {
        let mut cur = Some(id);
        while let Some(n) = cur {
            if self.nodes[n as usize].kind == NodeKind::Sentence {
                return Some(n);
            }
            cur = self.nodes[n as usize].parent;
        }
        None
    }

    /// The nearest enclosing ancestor (or self) of one of `kinds`.
    pub fn enclosing_of_kinds(&self, id: NodeId, kinds: &[NodeKind]) -> Option<NodeId> {
        let mut cur = Some(id);
        while let Some(n) = cur {
            if kinds.contains(&self.nodes[n as usize].kind) {
                return Some(n);
            }
            cur = self.nodes[n as usize].parent;
        }
        None
    }

    /// All descendant leaf ids (nodes with text) of `id`, in order.
    pub fn leaves_of(&self, id: NodeId) -> Vec<NodeId> {
        let mut out = Vec::new();
        let mut stack = vec![id];
        while let Some(nid) = stack.pop() {
            let node = &self.nodes[nid as usize];
            if node.text.is_some() {
                out.push(nid);
            }
            for (i, child) in node.children.iter().enumerate() {
                // push reversed so traversal stays in document order
                let _ = i;
                stack.push(*child);
            }
            // restore order: children were pushed in order, so reverse at end
        }
        out.sort_by_key(|&nid| self.nodes[nid as usize].span.start);
        out
    }

    /// Spans that must remain byte-identical in the output, honoring the
    /// parser protection mode (§5.2). Quotes are protected in every mode.
    pub fn protected_spans(&self) -> Vec<Span> {
        let mut out = Vec::new();
        for node in &self.nodes {
            match node.kind {
                NodeKind::Quote => out.push(node.span),
                NodeKind::CodeFence => {
                    let fmt = node
                        .meta
                        .attrs
                        .get("preamble")
                        .map(|s| s.as_str())
                        .unwrap_or("");
                    let protected = match self.protection {
                        ParserMode::FullProtection => true,
                        ParserMode::PartialProtection => {
                            !matches!(fmt, "markdown" | "md")
                        }
                        ParserMode::MinimalProtection => false,
                    };
                    if protected {
                        out.push(node.span);
                    }
                }
                _ => {}
            }
        }
        out.sort_by_key(|s| s.start);
        out
    }

    /// Parent-pointer integrity check (§26.1): every parent pointer must
    /// point to a node that lists this node as a child.
    pub fn parent_pointers_consistent(&self) -> bool {
        self.nodes.iter().all(|n| match n.parent {
            Some(p) => self
                .nodes
                .get(p as usize)
                .map(|pn| pn.children.contains(&n.id))
                .unwrap_or(false),
            None => n.id == self.root,
        })
    }

    /// True if `span` intersects any protected span.
    pub fn intersects_protected(&self, span: &Span) -> bool {
        self.protected_spans().iter().any(|p| p.overlaps(span))
    }
}
