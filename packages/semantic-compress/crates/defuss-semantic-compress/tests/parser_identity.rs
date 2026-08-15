use defuss_semantic_compress::{parse, render, NodeKind};

fn identity(input: &str) {
    let asl = parse(input);
    assert_eq!(render(&asl), input, "parse/render identity failed for {input:?}");
}

#[test]
fn parse_render_identity_plain_text() {
    identity("Hello world.");
    identity("This is a simple sentence. And another one!");
    identity("no punctuation at all");
    identity("Please, could you fix the bug now.");
    identity("I'd like you'd see I'd");
    identity("a");
    identity("");
}

#[test]
fn parse_render_identity_markdown() {
    identity("# Title\n\nSome text here.\n");
    identity("## Sub\n\n- item one\n- item two\n\n1. first\n2. second\n");
    identity("# T\n\n\ntext after two blank lines\n");
    identity("* star\n* wars\n");
    identity("1) alt\n2) style\n");
}

#[test]
fn parse_render_identity_quotes() {
    identity("\"Please fix the bug.\"\n");
    identity("He said \"hello there\" loudly.\n");
    identity("'single quoted' text\n");
    identity("`the` is a token.\n");
    identity("> blockquote line\n> second line\n\nafter\n");
    identity("unbalanced \" quote here\n");
}

#[test]
fn parse_render_identity_code_fence() {
    identity("```json\n{\n  \"a\": 1\n}\n```\n");
    identity("~~~js\nlet x = 1;\n~~~\n");
    identity("before\n\n```ts\nconst the = \"that\";\n```\n\nafter\n");
    identity("```\nno preamble fence\n```\n");
    identity("```json\nunclosed fence\n{\n");
    identity("````\nfour backticks\n````\n");
}

#[test]
fn parse_render_identity_tables() {
    identity("| Name | Age | City |\n| --- | ---: | --- |\n| Alice | 30 | Berlin |\n");
    identity("Name|Age\n---|---\nx|y\n");
    identity("| a | b |\n| --- | --- |\n| 1 |  |\n");
}

#[test]
fn parse_render_identity_unicode() {
        identity("Ümläute ß üöä.\n");
    identity("Emoji 👀 and ñandú.\n");
    identity("I'd like you’d see.\n");
    identity("Japanese: こんにちは世界。\n");
}

#[test]
fn parse_render_identity_mixed_document() {
    let input = "# Heading\n\nPlease, could you fix the bug now.\n\n```json\n{\n  \"a\": 1,\n  \"b\": [2, 3]\n}\n```\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n> quoted stuff\n\n- list item one.\n- list item two.\n";
    identity(input);
}

#[test]
fn asl_shape_snapshot_simple() {
    // §28.1: "Please fix this." -> Root > Paragraph > Sentence > tokens
    let asl = parse("Please fix this.");
    let root = asl.node(asl.root);
    assert_eq!(root.kind, NodeKind::Root);
    assert_eq!(root.children.len(), 1);
    let para = asl.node(root.children[0]);
    assert_eq!(para.kind, NodeKind::Paragraph);
    assert_eq!(para.children.len(), 1);
    let sentence = asl.node(para.children[0]);
    assert_eq!(sentence.kind, NodeKind::Sentence);
    let kinds: Vec<(NodeKind, &str)> = sentence
        .children
        .iter()
        .map(|&c| {
            let n = asl.node(c);
            (n.kind, n.text.as_deref().unwrap_or(""))
        })
        .collect();
    assert_eq!(
        kinds,
        vec![
            (NodeKind::Word, "Please"),
            (NodeKind::Whitespace, " "),
            (NodeKind::Word, "fix"),
            (NodeKind::Whitespace, " "),
            (NodeKind::Word, "this"),
            (NodeKind::Symbol, "."),
        ]
    );
}

#[test]
fn asl_shape_code_fence_meta() {
    let asl = parse("```json\n{}\n```\n");
    let root = asl.node(asl.root);
    let fence = asl.node(root.children[0]);
    assert_eq!(fence.kind, NodeKind::CodeFence);
    assert_eq!(fence.meta.attrs.get("preamble").map(|s| s.as_str()), Some("json"));
    assert!(fence.meta.protected);
    let kinds: Vec<NodeKind> = fence.children.iter().map(|&c| asl.node(c).kind).collect();
    assert_eq!(
        kinds,
        vec![NodeKind::CodeFencePreamble, NodeKind::CodeFenceBody, NodeKind::CodeFenceClosing]
    );
}

#[test]
fn asl_shape_inline_quote_protected() {
    let asl = parse("He said \"the bug\" loudly.\n");
    let quote = asl
        .nodes
        .iter()
        .find(|n| n.kind == NodeKind::Quote)
        .expect("quote node exists");
    assert!(quote.meta.protected);
}
