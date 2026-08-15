use crate::asl::{Asl, NodeId, NodeKind, Tag};
use crate::config::ParserMode;
use crate::parse::codefence::{fence_close, fence_open};
use crate::parse::markdown::{
    heading_level, is_blockquote, is_table_alignment_row, is_table_row, list_item_marker,
};
use crate::parse::quote::scan_inline_quotes;
use crate::parse::sentence::split_sentences;
use crate::parse::token::tokenize_into;
use crate::span::Span;

/// A line of input. `start..end` excludes the newline, `nl_end` includes it.
#[derive(Debug, Clone, Copy)]
pub struct Line {
    pub start: usize,
    pub end: usize,
    pub nl_end: usize,
}

impl Line {
    pub fn text<'a>(&self, input: &'a str) -> &'a str {
        &input[self.start..self.end]
    }

    pub fn is_blank(&self, input: &str) -> bool {
        self.text(input).trim().is_empty()
    }
}

pub fn split_lines(input: &str) -> Vec<Line> {
    let mut lines = Vec::new();
    let mut start = 0usize;
    for (i, c) in input.char_indices() {
        if c == '\n' {
            lines.push(Line {
                start,
                end: i,
                nl_end: i + 1,
            });
            start = i + 1;
        }
    }
    if start < input.len() {
        lines.push(Line {
            start,
            end: input.len(),
            nl_end: input.len(),
        });
    }
    lines
}

fn add_newline(asl: &mut Asl, parent: NodeId, line: &Line) -> NodeId {
    asl.add_node(
        NodeKind::Newline,
        Span::new(line.end, line.nl_end),
        parent,
        Some("\n".to_string()),
    )
}

/// Tokenizes line content into `parent`, splits it into sentences and scans
/// each sentence for inline quotes. Returns the sentence ids.
fn tokenize_line_content(
    asl: &mut Asl,
    parent: NodeId,
    input: &str,
    line: &Line,
    content_start: usize,
) -> Vec<NodeId> {
    tokenize_into(
        asl,
        parent,
        &input[content_start..line.end],
        content_start,
    );
    let sentences = split_sentences(asl, parent);
    for &sid in &sentences {
        scan_inline_quotes(asl, sid);
    }
    sentences
}

/// Parses `lines` (absolute byte offsets into `input`) into block nodes under
/// `parent`. Lossless: every byte of the line range ends up in a leaf.
pub fn parse_blocks(
    asl: &mut Asl,
    input: &str,
    parent: NodeId,
    lines: &[Line],
    mode: ParserMode,
) {
    let mut i = 0usize;
    while i < lines.len() {
        let line = lines[i];
        let text = line.text(input);

        // blank line -> Whitespace + Newline leaves directly under parent
        if line.is_blank(input) {
            if line.end > line.start {
                asl.add_node(
                    NodeKind::Whitespace,
                    Span::new(line.start, line.end),
                    parent,
                    Some(text.to_string()),
                );
            }
            if line.nl_end > line.end {
                add_newline(asl, parent, &line);
            }
            i += 1;
            continue;
        }

        // code fence
        if let Some((fence_char, fence_len, preamble)) = fence_open(text) {
            i = parse_code_fence(
                asl, input, parent, lines, i, fence_char, fence_len, preamble, mode,
            );
            continue;
        }

        // blockquote
        if is_blockquote(text) {
            let mut j = i;
            while j < lines.len() && is_blockquote(lines[j].text(input)) {
                j += 1;
            }
            let span = Span::new(line.start, lines[j - 1].nl_end);
            let qid = asl.add_node(
                NodeKind::Quote,
                span,
                parent,
                None,
            );
            {
                let q = asl.node_mut(qid);
                q.meta.protected = true;
                q.meta.tags.push(Tag::Quote);
                q.meta.attrs.insert("quote_char".to_string(), ">".to_string());
            }
            asl.add_node(NodeKind::Unknown, span, qid, Some(input[span.start..span.end].to_string()));
            i = j;
            continue;
        }

        // markdown table (current row + following alignment row)
        if is_table_row(text)
            && i + 1 < lines.len()
            && is_table_alignment_row(lines[i + 1].text(input))
        {
            let mut j = i;
            while j < lines.len()
                && is_table_row(lines[j].text(input))
                && !lines[j].is_blank(input)
            {
                j += 1;
            }
            let span = Span::new(line.start, lines[j - 1].nl_end);
            let tid = asl.add_node(NodeKind::MarkdownTable, span, parent, None);
            for (row_idx, rl) in lines[i..j].iter().enumerate() {
                let rid = asl.add_node(
                    NodeKind::MarkdownTableRow,
                    Span::new(rl.start, rl.end),
                    tid,
                    None,
                );
                if row_idx == 1 {
                    asl.node_mut(rid)
                        .meta
                        .attrs
                        .insert("alignment".to_string(), "true".to_string());
                }
                // cell structure (best-effort, for debugging/tooling)
                add_table_cells(asl, input, rid, rl);
                // raw line text keeps the table lossless
                asl.add_node(
                    NodeKind::Unknown,
                    Span::new(rl.start, rl.end),
                    rid,
                    Some(input[rl.start..rl.end].to_string()),
                );
                if rl.nl_end > rl.end {
                    add_newline(asl, tid, rl);
                }
            }
            i = j;
            continue;
        }

        // list item
        if list_item_marker(text).is_some() {
            let mut j = i;
            while j < lines.len() && list_item_marker(lines[j].text(input)).is_some() {
                j += 1;
            }
            let span = Span::new(line.start, lines[j - 1].nl_end);
            let lid = asl.add_node(NodeKind::MarkdownList, span, parent, None);
            for il in lines[i..j].iter() {
                let (indent_len, marker_len) = list_item_marker(il.text(input)).unwrap();
                let iid = asl.add_node(
                    NodeKind::MarkdownListItem,
                    Span::new(il.start, il.nl_end),
                    lid,
                    None,
                );
                let mut pos = il.start;
                if indent_len > 0 {
                    asl.add_node(
                        NodeKind::Whitespace,
                        Span::new(pos, pos + indent_len),
                        iid,
                        Some(input[pos..pos + indent_len].to_string()),
                    );
                    pos += indent_len;
                }
                asl.add_node(
                    NodeKind::Symbol,
                    Span::new(pos, pos + marker_len),
                    iid,
                    Some(input[pos..pos + marker_len].to_string()),
                );
                pos += marker_len;
                tokenize_line_content(asl, iid, input, il, pos);
                if il.nl_end > il.end {
                    add_newline(asl, iid, il);
                }
            }
            i = j;
            continue;
        }

        // heading
        if heading_level(text).is_some() {
            let span = Span::new(line.start, line.nl_end);
            let hid = asl.add_node(NodeKind::MarkdownHeading, span, parent, None);
            let trimmed_start = text.len() - text.trim_start_matches([' ', '\t']).len();
            let hashes = text[trimmed_start..]
                .chars()
                .take_while(|&c| c == '#')
                .count();
            let mut pos = line.start;
            if trimmed_start > 0 {
                asl.add_node(
                    NodeKind::Whitespace,
                    Span::new(pos, pos + trimmed_start),
                    hid,
                    Some(input[pos..pos + trimmed_start].to_string()),
                );
                pos += trimmed_start;
            }
            asl.add_node(
                NodeKind::Symbol,
                Span::new(pos, pos + hashes),
                hid,
                Some(input[pos..pos + hashes].to_string()),
            );
            pos += hashes;
            tokenize_line_content(asl, hid, input, &line, pos);
            if line.nl_end > line.end {
                add_newline(asl, hid, &line);
            }
            i += 1;
            continue;
        }

        // paragraph: consume consecutive plain lines
        let mut j = i;
        while j < lines.len() {
            let l = lines[j];
            let t = l.text(input);
            if l.is_blank(input)
                || fence_open(t).is_some()
                || is_blockquote(t)
                || list_item_marker(t).is_some()
                || heading_level(t).is_some()
            {
                break;
            }
            // stop before a table start (row followed by alignment row)
            if is_table_row(t)
                && j + 1 < lines.len()
                && is_table_alignment_row(lines[j + 1].text(input))
            {
                break;
            }
            j += 1;
        }
        let span = Span::new(line.start, lines[j - 1].nl_end);
        let pid = asl.add_node(NodeKind::Paragraph, span, parent, None);
        for pl in lines[i..j].iter() {
            tokenize_into(asl, pid, &input[pl.start..pl.end], pl.start);
            if pl.nl_end > pl.end {
                add_newline(asl, pid, pl);
            }
        }
        let sentences = split_sentences(asl, pid);
        for &sid in &sentences {
            scan_inline_quotes(asl, sid);
        }
        i = j;
    }
}

fn parse_code_fence(
    asl: &mut Asl,
    input: &str,
    parent: NodeId,
    lines: &[Line],
    start_idx: usize,
    fence_char: char,
    fence_len: usize,
    preamble: String,
    mode: ParserMode,
) -> usize {
    let open = lines[start_idx];
    let mut j = start_idx + 1;
    let mut close_idx: Option<usize> = None;
    while j < lines.len() {
        if fence_close(lines[j].text(input), fence_char, fence_len) {
            close_idx = Some(j);
            break;
        }
        j += 1;
    }
    let unclosed = close_idx.is_none();
    let end_line = close_idx.map(|c| lines[c]).unwrap_or(lines[lines.len() - 1]);
    let span = Span::new(open.start, end_line.nl_end);
    let fid = asl.add_node(NodeKind::CodeFence, span, parent, None);
    let preamble_norm = preamble.to_lowercase();
    let is_markdown = matches!(preamble_norm.as_str(), "markdown" | "md");
    {
        let f = asl.node_mut(fid);
        f.meta
            .attrs
            .insert("fence".to_string(), fence_char.to_string().repeat(fence_len));
        f.meta
            .attrs
            .insert("preamble".to_string(), preamble_norm.clone());
        if unclosed {
            f.meta
                .attrs
                .insert("malformed".to_string(), "unclosed".to_string());
        }
        // protection per parser mode (§5.2); malformed regions are always
        // protected (§6.1)
        let protected = unclosed
            || match mode {
                ParserMode::FullProtection => true,
                ParserMode::PartialProtection => !is_markdown,
                ParserMode::MinimalProtection => false,
            };
        if protected {
            f.meta.protected = true;
            f.meta.tags.push(Tag::CodeFence);
        }
    }
    // opening line (including newline)
    asl.add_node(
        NodeKind::CodeFencePreamble,
        Span::new(open.start, open.nl_end),
        fid,
        Some(input[open.start..open.nl_end].to_string()),
    );
    // body
    let body_start = open.nl_end;
    let body_end = close_idx.map(|c| lines[c].start).unwrap_or(end_line.nl_end);
    if body_end > body_start {
        let bid = asl.add_node(
            NodeKind::CodeFenceBody,
            Span::new(body_start, body_end),
            fid,
            None,
        );
        if is_markdown && mode != ParserMode::FullProtection && !unclosed {
            // markdown fences are parsed as prose (Partial/Minimal modes)
            let body_lines: Vec<Line> = split_lines(&input[body_start..body_end])
                .into_iter()
                .map(|l| Line {
                    start: l.start + body_start,
                    end: l.end + body_start,
                    nl_end: l.nl_end + body_start,
                })
                .collect();
            parse_blocks(asl, input, bid, &body_lines, mode);
        } else {
            let leaf = asl.add_node(
                NodeKind::Unknown,
                Span::new(body_start, body_end),
                bid,
                Some(input[body_start..body_end].to_string()),
            );
            if unclosed {
                // malformed region: protected, passes through unchanged
                asl.node_mut(leaf).meta.protected = true;
            }
        }
    }
    // closing line (including newline)
    if let Some(c) = close_idx {
        let cl = lines[c];
        asl.add_node(
            NodeKind::CodeFenceClosing,
            Span::new(cl.start, cl.nl_end),
            fid,
            Some(input[cl.start..cl.nl_end].to_string()),
        );
        c + 1
    } else {
        lines.len()
    }
}

fn add_table_cells(asl: &mut Asl, input: &str, row: NodeId, line: &Line) {
    let text = line.text(input);
    let trimmed = text.trim();
    let base = line.start + (text.len() - text.trim_start().len());
    let inner = trimmed.trim_start_matches('|').trim_end_matches('|');
    let lead_pipes = trimmed.len() - trimmed.trim_start_matches('|').len();
    let mut offset = lead_pipes;
    for cell in inner.split('|') {
        let cell_start = base + offset;
        asl.add_node(
            NodeKind::MarkdownTableCell,
            Span::new(cell_start, cell_start + cell.len()),
            row,
            None,
        );
        offset += cell.len() + 1; // +1 for the pipe
    }
}
