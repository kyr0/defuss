use defuss_semantic_compress::{compress, CompressConfig, TokenCounterKind};

fn main() {
    let cases: Vec<(&str, String)> = vec![
        ("polite_short", "Please, could you fix the bug now.".to_string()),
        ("polite_long", "I would like you to build this. I would appreciate if you could really simply fix the bug in the parser now, thanks.".to_string()),
        ("mixed_prompt", r#"Hi there! Please, could you basically fix the bug in this function now.

I would like you to review the code. It is just a small change to the parser.

```json
{
  "name": "defuss",
  "tags": ["a", "b"]
}
```

| Package | Size |
| --- | --- |
| defuss | 2KiB |

Thanks, you are the best.
"#.to_string()),
        ("plain_prose", "The quick brown fox jumps over the lazy dog. This sentence contains basically no politeness phrases at all.".to_string()),
        ("protected_heavy", "I think that this works. Please do not delete this. \"Please fix the bug.\" The Hague is nice.\n\n```ts\nconst the = \"that\";\n```\n".to_string()),
        ("log_like", (0..10).map(|_| "ERROR: connection failed").collect::<Vec<_>>().join("\n") + "\n"),
    ];

    println!("{:<18} {:>8} {:>8} {:>7} {:>8} {:>8} {:>7}", "case", "in_B", "out_B", "save%", "in_tok", "out_tok", "tok_sv%");
    let mut total_in = 0;
    let mut total_out = 0;
    let mut total_tin = 0;
    let mut total_tout = 0;
    for (name, input) in cases {
        let out = compress(
            &input,
            CompressConfig {
                lang: Some("en".to_string()),
                token_counter: Some(TokenCounterKind::Simple),
                ..Default::default()
            },
        )
        .unwrap();
        let m = &out.metrics;
        let (ti, to) = (m.input_tokens.unwrap(), m.output_tokens.unwrap());
        println!(
            "{:<18} {:>8} {:>8} {:>6.1}% {:>8} {:>8} {:>6.1}%",
            name,
            m.input_bytes,
            m.output_bytes,
            m.byte_saving_ratio() * 100.0,
            ti,
            to,
            if ti > 0 { (ti - to) as f64 / ti as f64 * 100.0 } else { 0.0 }
        );
        total_in += m.input_bytes;
        total_out += m.output_bytes;
        total_tin += ti;
        total_tout += to;
    }
    println!("{:<18} {:>8} {:>8} {:>6.1}% {:>8} {:>8} {:>6.1}%", "TOTAL",
        total_in, total_out, (total_in - total_out) as f64 / total_in as f64 * 100.0,
        total_tin, total_tout, (total_tin - total_tout) as f64 / total_tin as f64 * 100.0);
}
