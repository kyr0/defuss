use defuss_semantic_compress::{compress, CompressConfig, Compressor};

fn main() {
    let input1 = "Please, could you ".repeat(3) + "fix the bug.";
    let cfg = CompressConfig {
        emit_trace: true,
        emit_rejected_candidates: true,
        ..Default::default()
    };
    let c = Compressor::new(None, None).unwrap();
    let analysis = c.analyze(&input1, &cfg).unwrap();
    println!("chain candidates: {}", analysis.candidates.len());
    for cand in &analysis.candidates {
        println!(
            "  cand: {} kind={:?} conf={} span={:?}",
            cand.rule_id, cand.kind, cand.confidence, cand.target_span
        );
    }
    println!("chain review: {}", analysis.review.len());
    for cand in &analysis.review {
        println!("  review: {} kind={:?}", cand.rule_id, cand.kind);
    }
    println!("chain accepted: {}", analysis.accepted.len());
    for cand in &analysis.accepted {
        println!("  accepted: {} span={:?}", cand.rule_id, cand.target_span);
    }
    println!("chain rejected: {}", analysis.rejected.len());
    for r in &analysis.rejected {
        println!("  rejected: {} reason={}", r.rule_id, r.reason);
    }
    let out1 = compress(&input1, cfg.clone()).unwrap();
    println!("chain out: {:?}", out1.output);
    println!("chain violations: {}", out1.metrics.safety_violations);
}
