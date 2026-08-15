pub mod block;
pub mod codefence;
pub mod markdown;
pub mod quote;
pub mod sentence;
pub mod token;

use crate::asl::Asl;
use crate::config::{ParseStrategy, ParserMode};
use crate::error::CompressError;
use crate::span::Span;
use block::{parse_blocks, split_lines};
use codefence::{fence_close, fence_open};

/// Parses `input` into a lossless ASL tree with default settings
/// (FullProtection, BestEffort).
///
/// Invariant: `crate::render::render(&parse(input)) == input`.
pub fn parse(input: &str) -> Asl {
    parse_with(input, ParseStrategy::BestEffort, ParserMode::FullProtection)
        .expect("BestEffort parsing never fails")
}

/// Parses `input` with an explicit parse strategy and protection mode (§6.1).
///
/// Strict mode fails on malformed constructs (unclosed code fences,
/// unmatched quote symbols). BestEffort marks malformed regions Unknown and
/// protected — they pass through unchanged.
pub fn parse_with(
    input: &str,
    strategy: ParseStrategy,
    mode: ParserMode,
) -> Result<Asl, CompressError> {
    if strategy == ParseStrategy::Strict {
        if let Some(line_no) = find_unclosed_fence(input) {
            return Err(CompressError::ParseFailed(format!(
                "unclosed code fence starting at line {line_no}"
            )));
        }
    }
    let mut asl = Asl::with_protection(mode);
    asl.node_mut(asl.root).span = Span::new(0, input.len());
    let root = asl.root;
    let lines = split_lines(input);
    parse_blocks(&mut asl, input, root, &lines, mode);

    if strategy == ParseStrategy::Strict {
        // unmatched inline quotes are a parse error in strict mode
        let unmatched = asl.nodes.iter().any(|n| {
            n.kind == crate::asl::NodeKind::Symbol
                && n.text
                    .as_deref()
                    .map(|t| matches!(t, "\"" | "'" | "`" | "\u{201C}" | "\u{2018}"))
                    .unwrap_or(false)
                && !n.meta.protected
        });
        if unmatched {
            return Err(CompressError::ParseFailed(
                "unmatched quote symbol".to_string(),
            ));
        }
    }
    Ok(asl)
}

/// Returns the 1-based line number of an unclosed fence opening, if any.
fn find_unclosed_fence(input: &str) -> Option<usize> {
    let lines = split_lines(input);
    let mut i = 0;
    while i < lines.len() {
        let text = lines[i].text(input);
        if let Some((fc, fl, _)) = fence_open(text) {
            let mut j = i + 1;
            let mut closed = false;
            while j < lines.len() {
                if fence_close(lines[j].text(input), fc, fl) {
                    closed = true;
                    break;
                }
                j += 1;
            }
            if !closed {
                return Some(i + 1);
            }
            i = j + 1;
        } else {
            i += 1;
        }
    }
    None
}
