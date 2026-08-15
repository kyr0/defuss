use crate::asl::{Asl, NodeId, NodeKind};
use crate::span::Span;

/// True for characters that make up a word token body.
fn is_word_char(c: char) -> bool {
    c.is_alphanumeric() || c == '_'
}

/// Tokenizes `text` (a single line fragment, no newlines) into leaf nodes
/// under `parent`. `base` is the byte offset of `text` in the original input.
///
/// Produces Word / Symbol / Whitespace leaves covering every byte of `text`.
pub fn tokenize_into(asl: &mut Asl, parent: NodeId, text: &str, base: usize) -> Vec<NodeId> {
    let mut out = Vec::new();
    let chars: Vec<(usize, char)> = text.char_indices().collect();
    let mut i = 0;
    while i < chars.len() {
        let (byte, c) = chars[i];
        if c == ' ' || c == '\t' || c == '\r' {
            let start = byte;
            let mut j = i + 1;
            while j < chars.len() && matches!(chars[j].1, ' ' | '\t' | '\r') {
                j += 1;
            }
            let end = if j < chars.len() { chars[j].0 } else { text.len() };
            out.push(asl.add_node(
                NodeKind::Whitespace,
                Span::new(base + start, base + end),
                parent,
                Some(text[start..end].to_string()),
            ));
            i = j;
        } else if is_word_char(c) {
            let start = byte;
            let mut j = i + 1;
            while j < chars.len() {
                let (b, cj) = chars[j];
                if is_word_char(cj) {
                    j += 1;
                } else if (cj == '\'' || cj == '\u{2019}')
                    && j + 1 < chars.len()
                    && is_word_char(chars[j + 1].1)
                {
                    // intra-word apostrophe: I'd, I'd, don't
                    j += 2;
                } else {
                    let _ = b;
                    break;
                }
            }
            let end = if j < chars.len() { chars[j].0 } else { text.len() };
            out.push(asl.add_node(
                NodeKind::Word,
                Span::new(base + start, base + end),
                parent,
                Some(text[start..end].to_string()),
            ));
            i = j;
        } else {
            let end = byte + c.len_utf8();
            out.push(asl.add_node(
                NodeKind::Symbol,
                Span::new(base + byte, base + end),
                parent,
                Some(text[byte..end].to_string()),
            ));
            i += 1;
        }
    }
    out
}

/// Case-folds a word: lowercase + curly apostrophe normalization.
pub fn fold_word(s: &str) -> String {
    s.chars()
        .map(|c| if c == '\u{2019}' { '\'' } else { c })
        .collect::<String>()
        .to_lowercase()
}
