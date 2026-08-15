use crate::asl::Asl;
use crate::rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};

use super::codefence_json::fence_bodies;

const RAW_TEXT_TAGS: &[&str] = &["pre", "code", "textarea", "script", "style"];

/// Conservative HTML minification (§21.4): collapses inter-tag whitespace.
/// Content of pre/code/textarea/script/style is never altered.
pub fn generate(asl: &Asl, input: &str, enabled: bool) -> Vec<Candidate> {
    if !enabled {
        return Vec::new();
    }
    fence_bodies(asl, input, "html")
        .into_iter()
        .filter_map(|(span, body)| {
            let mut min = minify_html(&body);
            if body.ends_with('\n') && !min.ends_with('\n') {
                min.push('\n');
            }
            if min == body || min.len() >= body.len() {
                return None;
            }
            Some(Candidate {
                id: 0,
                rule_id: "shared.codefence.html.minify".to_string(),
                phase: Phase::CodefenceFormat,
                priority: 150,
                layer: TransformLayer::Block,
                target_nodes: Vec::new(),
                target_span: span,
                kind: CandidateKind::CompactStructuredFormat,
                replacement: Some(min),
                safety: SafetyClass::Safe,
                requires_sibling_edit: false,
            allowed_in_protected: true,
            })
        })
        .collect()
}

fn minify_html(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut pos = 0usize;
    let mut protected_tag: Option<String> = None;
    while pos < html.len() {
        let rest = &html[pos..];
        if protected_tag.is_none() && rest.starts_with('<') {
            let (name, _closing, tag_end) = parse_tag(html, pos);
            if let Some(name) = name {
                let lname = name.to_lowercase();
                if RAW_TEXT_TAGS.contains(&lname.as_str()) {
                    // copy the whole opening tag, then enter raw-text mode
                    out.push_str(&html[pos..pos + tag_end]);
                    pos += tag_end;
                    protected_tag = Some(lname);
                } else {
                    // copy up to (excluding) '>' so the next iteration's
                    // '>' branch handles inter-tag whitespace collapse
                    out.push_str(&html[pos..pos + tag_end - 1]);
                    pos += tag_end - 1;
                }
                continue;
            }
            // comment / doctype / invalid: copy the '<' verbatim
            out.push('<');
            pos += 1;
            continue;
        }
        if let Some(tag) = protected_tag.clone() {
            let lower = rest.to_lowercase();
            let close = format!("</{tag}");
            if lower.starts_with(&close) {
                let tag_len = find_tag_end(html, pos) - pos;
                // copy up to '>' so the '>' branch collapses what follows
                out.push_str(&html[pos..pos + tag_len - 1]);
                pos += tag_len - 1;
                protected_tag = None;
                continue;
            }
            // raw text: copy one char verbatim
            let ch = rest.chars().next().unwrap();
            out.push(ch);
            pos += ch.len_utf8();
            continue;
        }
        // outside raw-text elements
        let ch = rest.chars().next().unwrap();
        if ch == '>' {
            out.push('>');
            pos += 1;
            // collapse whitespace after a tag
            let mut ws_end = pos;
            let mut saw_newline = false;
            while ws_end < html.len() {
                let wc = html[ws_end..].chars().next().unwrap();
                if !wc.is_whitespace() {
                    break;
                }
                if wc == '\n' {
                    saw_newline = true;
                }
                ws_end += wc.len_utf8();
            }
            if ws_end > pos {
                if html[ws_end..].starts_with('<') {
                    // tag-to-tag whitespace: drop entirely
                } else if saw_newline {
                    // keep a single newline (line structure preserved)
                    out.push('\n');
                } else {
                    // text content: collapse to a single space
                    out.push(' ');
                }
                pos = ws_end;
            }
            continue;
        }
        out.push(ch);
        pos += ch.len_utf8();
    }
    out
}

/// Parses a tag starting at `html[start..] == "<..."`. Returns
/// (name, is_closing, tag byte length incl. `>`).
fn parse_tag(html: &str, start: usize) -> (Option<String>, bool, usize) {
    let rest = &html[start..];
    let mut i = 1; // skip '<'
    let mut closing = false;
    if rest[i..].starts_with('/') {
        closing = true;
        i += 1;
    }
    let name_start = i;
    while i < rest.len()
        && rest[i..].chars().next().unwrap().is_ascii_alphanumeric()
    {
        i += rest[i..].chars().next().unwrap().len_utf8();
    }
    let name = if i > name_start {
        Some(rest[name_start..i].to_string())
    } else {
        None
    };
    (name, closing, find_tag_end(html, start) - start)
}

/// Byte offset (absolute) just after the next unquoted `>`.
fn find_tag_end(html: &str, start: usize) -> usize {
    let bytes = html.as_bytes();
    let mut i = start;
    let mut quote: Option<u8> = None;
    while i < bytes.len() {
        match quote {
            Some(q) => {
                if bytes[i] == q {
                    quote = None;
                }
            }
            None => match bytes[i] {
                b'"' | b'\'' => quote = Some(bytes[i]),
                b'>' => return i + 1,
                _ => {}
            },
        }
        i += 1;
    }
    bytes.len()
}
