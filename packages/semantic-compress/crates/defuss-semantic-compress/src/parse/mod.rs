pub mod block;
pub mod codefence;
pub mod markdown;
pub mod quote;
pub mod sentence;
pub mod token;

use crate::asl::Asl;
use crate::span::Span;
use block::{parse_blocks, split_lines};

/// Parses `input` into a lossless ASL tree.
///
/// Invariant: `crate::render::render(&parse(input)) == input`.
pub fn parse(input: &str) -> Asl {
    let mut asl = Asl::new();
    asl.node_mut(asl.root).span = Span::new(0, input.len());
    let root = asl.root;
    let lines = split_lines(input);
    parse_blocks(&mut asl, input, root, &lines);
    asl
}
