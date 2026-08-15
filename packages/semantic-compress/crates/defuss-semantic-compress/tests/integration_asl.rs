use defuss_semantic_compress::{classify, CompressConfig, Compressor, Tag};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
struct IntegrationFixture {
    id: String,
    #[serde(default)]
    lang: Option<String>,
    input: String,
    #[serde(default)]
    expected_classifications: Vec<(String, String)>,
    #[serde(default)]
    expected_candidates: Vec<String>,
    #[serde(default)]
    expected_resolved: Vec<String>,
    #[serde(default)]
    expected_rejected: Vec<String>,
    expected_output: String,
}

fn fixture_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/integration")
}

/// §28.2: integration tests against the ASL — parse tree classification,
/// generated candidates, resolved candidates and final output are all
/// inspected per fixture.
#[test]
fn integration_fixtures_pass() {
    let mut paths: Vec<PathBuf> = std::fs::read_dir(fixture_dir())
        .unwrap()
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().map(|e| e == "json").unwrap_or(false))
        .collect();
    paths.sort();
    assert!(!paths.is_empty());

    let mut failures = 0;
    for path in paths {
        let src = std::fs::read_to_string(&path).unwrap();
        let fx: IntegrationFixture = serde_json::from_str(&src).unwrap();
        if let Err(e) = run_fixture(&fx) {
            failures += 1;
            eprintln!("FAILED {}: {}", fx.id, e);
        }
    }
    assert_eq!(failures, 0);
}

fn run_fixture(fx: &IntegrationFixture) -> Result<(), String> {
    let compressor = Compressor::new(fx.lang.as_deref(), None).map_err(|e| e.to_string())?;
    let config = CompressConfig {
        lang: fx.lang.clone(),
        ..Default::default()
    };
    let analysis = compressor.analyze(&fx.input, &config).map_err(|e| e.to_string())?;

    // 1. classifications
    for (text, expected) in &fx.expected_classifications {
        let node = analysis
            .asl
            .nodes
            .iter()
            .find(|n| n.text.as_deref() == Some(text.as_str()))
            .ok_or_else(|| format!("word {text:?} not found in ASL"))?;
        let kind_name = format!("{:?}", node.kind);
        let tag_hit = node
            .meta
            .tags
            .iter()
            .any(|t| format!("{t:?}") == *expected);
        if kind_name != *expected && !tag_hit {
            return Err(format!(
                "classification of {text:?}: expected {expected}, got kind {kind_name} tags {:?}",
                node.meta.tags
            ));
        }
    }

    // 2. generated candidates
    let generated: Vec<&str> = analysis.candidates.iter().map(|c| c.rule_id.as_str()).collect();
    for want in &fx.expected_candidates {
        if !generated.contains(&want.as_str()) {
            return Err(format!(
                "candidate {want} not generated; got: {generated:?}"
            ));
        }
    }

    // 3. resolved candidates
    let accepted: Vec<&str> = analysis.accepted.iter().map(|c| c.rule_id.as_str()).collect();
    for want in &fx.expected_resolved {
        if !accepted.contains(&want.as_str()) {
            return Err(format!("resolved {want} missing; got: {accepted:?}"));
        }
    }
    let rejected: Vec<&str> = analysis.rejected.iter().map(|c| c.rule_id.as_str()).collect();
    for want in &fx.expected_rejected {
        if !rejected.contains(&want.as_str()) {
            return Err(format!("rejected {want} missing; got: {rejected:?}"));
        }
    }

    // 4. final output
    if analysis.output != fx.expected_output {
        return Err(format!(
            "output: expected {:?}, got {:?}",
            fx.expected_output, analysis.output
        ));
    }

    // 5. compressed path also agrees (with safety checks)
    let result = compressor
        .compress(&fx.input, &config)
        .map_err(|e| e.to_string())?;
    if result.output != fx.expected_output {
        return Err(format!(
            "compress output: expected {:?}, got {:?}",
            fx.expected_output, result.output
        ));
    }
    Ok(())
}

// keep imports used across cfg boundaries explicit
#[allow(dead_code)]
fn _use(_t: Tag) {}
