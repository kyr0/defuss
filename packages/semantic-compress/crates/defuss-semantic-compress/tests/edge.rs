use defuss_semantic_compress::{compress, CompressConfig};

#[test]
fn edge_cases_no_panic_no_growth() {
    let cases = [
        "",
        " ",
        "\n",
        "\n\n\n\n",
        "a",
        ".",
        "...",
        "👀",
        "こんにちは",
        " \n",
        "the",
        "the the the",
        "a  \n  b",
        "```\n\n```\n",
        "```json\n{}\n```",
        "| |\n| --- |\n",
        "- \n- \n",
        ">\n",
        "#\n",
        "# \n",
        "\t\ttabs\t\t",
        "I would",
        "please",
        "Please.",
        "thanks",
    ];
    for input in cases {
        let out = compress(input, CompressConfig::default()).unwrap();
        assert!(out.output.len() <= input.len(), "grew for {input:?}");
        let twice = compress(&out.output, CompressConfig::default()).unwrap();
        assert_eq!(out.output, twice.output, "not idempotent for {input:?}");
    }
}
