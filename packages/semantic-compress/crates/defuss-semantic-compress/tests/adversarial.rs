//! §26.6 adversarial fixtures: known failure modes must never crash, grow
//! output, or violate protection.

use defuss_semantic_compress::{compress, parse, render, CompressConfig};

fn check(input: &str) -> String {
    // parse/render identity holds even for adversarial input
    assert_eq!(render(&parse(input)), input, "identity failed for {input:?}");
    let out = compress(input, CompressConfig::default()).unwrap();
    assert!(
        out.output.len() <= input.len(),
        "output grew for {input:?}: {:?}",
        out.output
    );
    let twice = compress(&out.output, CompressConfig::default()).unwrap();
    assert_eq!(out.output, twice.output, "not idempotent for {input:?}");
    out.output
}

#[test]
fn adversarial_empty_and_whitespace() {
    assert_eq!(check(""), "");
    assert_eq!(check("   "), "   ");
    assert_eq!(check("\n\n\n\n"), "\n\n");
    assert_eq!(check(" \n \n"), " \n \n");
}

#[test]
fn adversarial_only_code_fences() {
    let input = "```json\n{\"a\": 1}\n```\n```css\na { color: red; }\n```\n";
    let out = check(input);
    assert!(out.contains("{\"a\":1}"));
    assert!(out.contains("a{color:red}"));
}

#[test]
fn adversarial_nested_code_fences() {
    // a fence inside a fence: the inner opener is body content
    let input = "```markdown\n```json\n{\"a\": 1}\n```\n```\n";
    let out = check(input);
    assert!(out.contains("```"));
}

#[test]
fn adversarial_unicode_edge_cases() {
    check("Emoji 👀 family 👨‍👩‍👧‍👦 zwj\n");
    check("Combining: e\u{0301}a\u{0308}nd\n");
    check("Fullwidth: ｈｅｌｌｏ the\n");
    check("Right-to-left: مرحبا the بالعالم\n");
}

#[test]
fn adversarial_very_long_single_line() {
    let input = "word ".repeat(300_000) + "the"; // >1MB single line
    let out = check(&input);
    assert!(out.ends_with("word")); // trailing "the" det removed
    assert!(out.len() < input.len());
}

#[test]
fn adversarial_deep_quote_nesting() {
    // 100+ levels of quote-ish nesting: unmatched, so no Quote nodes
    let input = format!("{}deep{}", "\"".repeat(120), "\"".repeat(120));
    check(&input);
    // matched pairs nest: outer " + inner ' pairs
    let nested = format!("\"{}the bug{}\"", "'".repeat(60), "'".repeat(60));
    check(&nested);
}

#[test]
fn adversarial_mixed_rtl_ltr() {
    let input = "Please fix the bug שלום עולם now.";
    let out = check(input);
    assert_eq!(out, "fix bug שלום עולם now");
}

#[test]
fn adversarial_binary_garbage_in_prose() {
    let mut s = String::from("Please fix ");
    s.push('\u{FFFD}');
    s.push('\u{0001}');
    s.push_str(" the bug now.");
    let out = check(&s);
    assert!(out.starts_with("fix"));
}

#[test]
fn adversarial_unmatched_quotes() {
    check("a \" stray quote here");
    check("a ' stray quote here");
    check("a ` stray quote here");
    check("\"unclosed only");
}

#[test]
fn adversarial_paths_with_special_characters() {
    let out = check("open /Users/aron/my project/v2 (final)/file now");
    assert!(out.contains("~/my project"));
}

#[test]
fn adversarial_code_fence_invalid_language_tag() {
    // unknown preambles are protected and pass through
    let input = "```frobnicate-lang\nthe a an\n```\n";
    assert_eq!(check(input), input);
    // empty preamble
    let input2 = "```\nthe a an\n```\n";
    assert_eq!(check(input2), input2);
}

#[test]
fn adversarial_extremely_long_politeness_chain() {
    let input = "Please, could you ".repeat(100) + "fix the bug.";
    let out = check(&input);
    // only the sentence-initial prefix can anchor; det/period still fire
    assert!(out.len() < input.len());
}

#[test]
fn adversarial_overlapping_rule_conflicts() {
    // 50+ candidates in one sentence: heavy det/filler/politeness overlap.
    // Full compression would violate the default 10% budget, and no
    // idempotent output exists between "input" and "fully compressed" —
    // so the safety net must fall back to the unchanged input (§19.2/§19.3).
    let words: Vec<String> = std::iter::repeat("the".to_string())
        .take(50)
        .chain(std::iter::repeat("basically".to_string()).take(50))
        .collect();
    let input = format!("Please fix {} now.", words.join(" "));
    let out = check(&input);
    let ratio_ok = out.len() as f32 >= 0.1 * input.len() as f32;
    assert!(
        ratio_ok || out == input,
        "must satisfy budget or fall back: {:?}",
        &out[..out.len().min(60)]
    );
    if out != input {
        assert!(out.starts_with("fix"));
    }
}

#[test]
fn adversarial_truncated_multibyte_at_boundaries() {
    // span boundaries must be char boundaries even around emoji
    let input = "Please fix the 👀 bug now.";
    let out = check(input);
    assert_eq!(out, "fix 👀 bug now");
}
