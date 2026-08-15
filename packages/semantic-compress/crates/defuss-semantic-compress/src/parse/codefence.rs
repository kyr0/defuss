// Code fence detection helpers (``` and ~~~ fences).

/// If `line` opens a code fence, returns (fence_marker, fence_len, preamble).
/// The preamble is the trimmed remainder after the fence characters.
pub fn fence_open(line: &str) -> Option<(char, usize, String)> {
    let trimmed = line.trim_start_matches([' ', '\t']);
    let mut ch_iter = trimmed.chars();
    let first = ch_iter.next()?;
    if first != '`' && first != '~' {
        return None;
    }
    let count = trimmed.chars().take_while(|&c| c == first).count();
    if count < 3 {
        return None;
    }
    let rest: String = trimmed[count..].trim().to_string();
    // info string of a backtick fence must not contain backticks
    if first == '`' && rest.contains('`') {
        return None;
    }
    Some((first, count, rest))
}

/// True if `line` closes a fence opened with (`fence_char`, `fence_len`).
pub fn fence_close(line: &str, fence_char: char, fence_len: usize) -> bool {
    let trimmed = line.trim_end();
    let trimmed = trimmed.trim_start_matches([' ', '\t']);
    if trimmed.is_empty() {
        return false;
    }
    let count = trimmed.chars().take_while(|&c| c == fence_char).count();
    if count < fence_len {
        return false;
    }
    trimmed[count..].trim().is_empty()
}
