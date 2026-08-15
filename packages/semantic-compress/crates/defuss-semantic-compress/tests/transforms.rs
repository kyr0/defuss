use defuss_semantic_compress::{compress, CompressConfig};

fn en(input: &str) -> String {
    compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            ..Default::default()
        },
    )
    .unwrap()
    .output
}

#[test]
fn json_code_fence_minified() {
    let input = "```json\n{\n  \"a\": 1,\n  \"b\": [2, 3]\n}\n```\n";
    assert_eq!(en(input), "```json\n{\"a\":1,\"b\":[2,3]}\n```\n");
}

#[test]
fn json_code_fence_invalid_left_unchanged() {
    let input = "```json\n{not json}\n```\n";
    assert_eq!(en(input), input);
}

#[test]
fn ts_code_fence_protected() {
    let input = "```ts\nconst the = \"that\";\n```\n";
    assert_eq!(en(input), input);
}

#[test]
fn css_code_fence_minified() {
    let input = "```css\n/* comment */\na, b {\n  color: red;\n}\n```\n";
    assert_eq!(en(input), "```css\na,b{color:red}\n```\n");
}

#[test]
fn css_string_content_preserved() {
    let input = "```css\na::before {\n  content: \"a  b\";\n}\n```\n";
    let out = en(input);
    assert!(out.contains("\"a  b\""), "string content altered: {out:?}");
}

#[test]
fn html_code_fence_minified() {
    let input = "```html\n<div>\n    <p>hi</p>\n</div>\n```\n";
    assert_eq!(en(input), "```html\n<div><p>hi</p></div>\n```\n");
}

#[test]
fn html_pre_content_untouched() {
    let input = "```html\n<pre>\n  keep   this\n</pre>\n<div>\n  <p>x</p>\n</div>\n```\n";
    let out = en(input);
    assert!(out.contains("<pre>\n  keep   this\n</pre>"), "pre altered: {out:?}");
    assert!(out.contains("<div><p>x</p></div>"), "div not minified: {out:?}");
}

#[test]
fn markdown_table_compressed() {
    let input = "| Name | Age | City |\n| --- | ---: | --- |\n| Alice | 30 | Berlin |\n";
    let expected = "Name|Age|City\n---|---:|---\nAlice|30|Berlin\n";
    assert_eq!(en(input), expected);
}

#[test]
fn markdown_table_preserves_empty_cells_and_columns() {
    let input = "| a |  | b |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n";
    let out = en(input);
    let lines: Vec<&str> = out.lines().collect();
    assert_eq!(lines[0], "a||b");
    assert_eq!(lines[1], "---|---|---");
    assert_eq!(lines[2], "1|2|3");
}

#[test]
fn repeat_lines_compressed() {
    let input = "foo\nfoo\nfoo\n";
    assert_eq!(en(input), "foo x3\n");
}

#[test]
fn repeat_lines_two_identical_long_lines() {
    let input = "abcdefgh\nabcdefgh\n";
    assert_eq!(en(input), "abcdefgh x2\n");
}

#[test]
fn repeat_lines_short_lines_not_worth_it() {
    // "ab\nab" (5) -> "ab x2" (5): no saving, unchanged
    let input = "ab\nab\n";
    assert_eq!(en(input), input);
}

#[test]
fn repeat_lines_not_similar_only_exact() {
    let input = "foo bar\nfoo baz\nfoo bar\nfoo bar\n";
    assert_eq!(en(input), "foo bar\nfoo baz\nfoo bar x2\n");
}

#[test]
fn repeat_lines_inside_code_fence_protected() {
    let input = "```txt\nfoo\nfoo\nfoo\n```\n";
    assert_eq!(en(input), input);
}

#[test]
fn path_compression() {
    let input = "open /Users/aron/code/project now";
    assert_eq!(en(input), "open ~/code/project now");
}

#[test]
fn path_compression_linux_home() {
    let input = "see /home/aron/docs";
    assert_eq!(en(input), "see ~/docs");
}

#[test]
fn path_inside_code_fence_protected() {
    let input = "```sh\ncd /Users/aron/code\n```\n";
    assert_eq!(en(input), input);
}

#[test]
fn bad_word_removed() {
    let input = "What the hell is this bug.";
    // "hell" removed; "the" removed; final period removed (sibling edits)
    assert_eq!(en(input), "What is bug");
}

#[test]
fn bad_word_in_quote_protected() {
    let input = "He said \"damn it\" loudly.";
    assert_eq!(en(input), input);
}

#[test]
fn docstring_collapsed() {
    let input = "/**\n * Foo\n */\n";
    assert_eq!(en(input), "/** Foo */\n");
}

#[test]
fn docstring_multiline_body_untouched() {
    let input = "/**\n * Foo\n * Bar\n */\n";
    assert_eq!(en(input), input);
}

#[test]
fn docstring_inside_code_fence_protected() {
    let input = "```ts\n/**\n * Foo\n */\n```\n";
    assert_eq!(en(input), input);
}

#[test]
fn markdown_blank_lines_collapsed() {
    let input = "one\n\n\n\ntwo\n";
    assert_eq!(en(input), "one\n\ntwo\n");
}

#[test]
fn single_blank_line_preserved() {
    let input = "one\n\ntwo\n";
    assert_eq!(en(input), input);
}

#[test]
fn markdown_fence_content_is_compressed() {
    // CodeFence(markdown) exception: det/filler rules apply inside, but only
    // in PartialProtection mode (§5.2); FullProtection leaves fences alone
    let input = "```markdown\nPlease fix the bug now.\n```\n";
    let out = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            parser_mode: defuss_semantic_compress::ParserMode::PartialProtection,
            ..Default::default()
        },
    )
    .unwrap();
    assert!(out.output.contains("fix bug now"), "unexpected: {out:?}");
    // default (FullProtection): fence content untouched
    let full = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(full.output, input);
}

#[test]
fn enable_flags_disable_transforms() {
    let input = "```json\n{\n  \"a\": 1\n}\n```\n";
    let out = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            enable_codefence_formats: false,
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(out.output, input);
}

#[test]
fn repeat_lines_inside_table_preserved() {
    // identical table rows keep row structure (§21.6 row count preserved)
    let input = "a|b\n---|---\nx|y\nx|y\n";
    assert_eq!(en(input), input);
}
