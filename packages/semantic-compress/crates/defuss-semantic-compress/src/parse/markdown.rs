// Markdown block detection helpers (headings, lists, tables).

/// ATX heading: `# ` .. `###### ` (1-6 hashes followed by space or EOL).
pub fn heading_level(line: &str) -> Option<usize> {
    let trimmed = line.trim_start_matches([' ', '\t']);
    let hashes = trimmed.chars().take_while(|&c| c == '#').count();
    if hashes == 0 || hashes > 6 {
        return None;
    }
    let rest = &trimmed[hashes..];
    if rest.is_empty() || rest.starts_with(' ') || rest.starts_with('\t') {
        Some(hashes)
    } else {
        None
    }
}

/// Unordered (`-`, `*`, `+`) or ordered (`1.`, `2)`) list item marker.
/// Returns (indent_len, marker_len) byte counts within `line`.
pub fn list_item_marker(line: &str) -> Option<(usize, usize)> {
    let indent = line.len() - line.trim_start_matches([' ', '\t']).len();
    let rest = &line[indent..];
    let mut chars = rest.chars();
    let first = chars.next()?;
    if matches!(first, '-' | '*' | '+') {
        let after = &rest[first.len_utf8()..];
        if after.is_empty() || after.starts_with(' ') || after.starts_with('\t') {
            return Some((indent, first.len_utf8()));
        }
        return None;
    }
    if first.is_ascii_digit() {
        let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
        let after = &rest[digits.len()..];
        let mut ach = after.chars();
        if let Some(sep) = ach.next() {
            if (sep == '.' || sep == ')') && digits.len() <= 9 {
                let tail = &after[sep.len_utf8()..];
                if tail.is_empty() || tail.starts_with(' ') || tail.starts_with('\t') {
                    return Some((indent, digits.len() + sep.len_utf8()));
                }
            }
        }
    }
    None
}

/// True if the line looks like a table row (contains a pipe).
pub fn is_table_row(line: &str) -> bool {
    let t = line.trim();
    t.contains('|')
}

/// True if the line is a table alignment row, e.g. `| --- | ---: | :--- |`.
pub fn is_table_alignment_row(line: &str) -> bool {
    let t = line.trim().trim_matches('|');
    if t.trim().is_empty() {
        return false;
    }
    t.split('|').all(|cell| {
        let c = cell.trim();
        !c.is_empty()
            && c.chars().all(|ch| ch == '-' || ch == ':')
            && c.chars().filter(|&ch| ch == '-').count() >= 1
            && c.chars().filter(|&ch| ch == ':').count() <= 2
            && (c.starts_with(':') || c.starts_with('-'))
            && (c.ends_with(':') || c.ends_with('-'))
    })
}

/// True if a blockquote line (up to 3 spaces, then `>`).
pub fn is_blockquote(line: &str) -> bool {
    let trimmed = line.trim_start_matches([' ', '\t']);
    trimmed.starts_with('>')
}
