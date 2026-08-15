use defuss_semantic_compress::{compress, parse, render, CompressConfig};

#[test]
fn smoke_parse_identity() {
    let input = "Hello world.\n\n## Title\n\n- a item\n- b item\n\n```json\n{\"a\": 1}\n```\n";
    let asl = parse(input);
    assert_eq!(render(&asl), input);
}

#[test]
fn smoke_compress_polite() {
    let out = compress(
        "Please, could you fix the bug now.",
        CompressConfig {
            lang: Some("en".to_string()),
            ..Default::default()
        },
    )
    .unwrap();
    println!("output: {:?}", out.output);
    assert_eq!(out.output, "fix bug now");
}
