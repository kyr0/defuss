use defuss_semantic_compress::{compress, CompressConfig};

/// §28.4 negative tests: these inputs must remain byte-identical.
fn assert_unchanged(input: &str) {
    let out = compress(
        input,
        CompressConfig {
            lang: Some("en".to_string()),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(out.output, input, "input was modified: {input:?}");
}

#[test]
fn complementizer_sentence_unchanged() {
    assert_unchanged("I think that this works.");
}

#[test]
fn named_entity_unchanged() {
    assert_unchanged("The Hague is nice.");
}

#[test]
fn negation_do_not_unchanged() {
    assert_unchanged("Please do not delete this.");
}

#[test]
fn negation_could_you_not_unchanged() {
    assert_unchanged("Could you not change this?");
}

#[test]
fn double_quoted_sentence_unchanged() {
    assert_unchanged("\"Please fix the bug.\"");
}

#[test]
fn backtick_quoted_det_unchanged() {
    assert_unchanged("`the` is a token.");
}

#[test]
fn blockquote_unchanged() {
    assert_unchanged("> Please fix the bug.");
}

#[test]
fn ts_code_fence_unchanged() {
    assert_unchanged("```ts\nconst the = \"that\";\n```\n");
}

#[test]
fn ensure_that_clause_unchanged() {
    assert_unchanged("Ensure that the file exists.");
}

#[test]
fn plain_sentence_unchanged() {
    // no politeness, no det/filler at risk, no sibling edit for the period
    assert_unchanged("He went to Berlin.");
}

#[test]
fn single_word_this_unchanged() {
    // §21.1: det removal must not empty a sentence
    assert_unchanged("this");
    assert_unchanged("that");
}
