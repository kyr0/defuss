//! defuss-semantic-compress: deterministic, safe-only semantic compressor
//! for LLM input text.
//!
//! Architecture (see implementation-plan.md §33):
//!
//! ```text
//! input text
//!   -> lossless ASL parse
//!   -> classification
//!   -> rule matching on immutable node graph
//!   -> candidate transformations
//!   -> conflict resolver / writer planner
//!   -> final writer output
//! ```
//!
//! Rules never mutate text. Rules emit candidates. Candidates target
//! immutable ASL node spans. The writer writes from the original input.
//! The conflict resolver chooses safe deterministic winners. Only resolved
//! candidates affect output.

pub mod asl;
pub mod classify;
pub mod config;
pub mod error;
pub mod fixtures;
pub mod metrics;
pub mod parse;
pub mod render;
pub mod rules;
pub mod safety;
pub mod span;
pub mod trace;
pub mod transforms;

pub use asl::{Asl, Node, NodeId, NodeKind, NodeMeta, Tag};
pub use config::{CompressConfig, TokenCounterKind};
pub use error::CompressError;
pub use metrics::Metrics;
pub use parse::parse;
pub use render::render;
pub use rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};
pub use rules::loader::RuleSet;
pub use span::Span;
pub use trace::{RejectedCandidate, TraceEvent};

use rules::loader::load_rules;
use rules::matcher::MatchContext;
use rules::schema::RuleJson;

#[derive(Debug, Clone)]
pub struct CompressResult {
    pub output: String,
    pub trace: Vec<TraceEvent>,
    pub rejected: Vec<RejectedCandidate>,
    pub metrics: Metrics,
    pub asl_debug: Option<Asl>,
}

/// Full pipeline inspection (parse tree, generated candidates, resolution).
/// Used by integration tests and the CLI's `--debug-candidates`.
#[derive(Debug, Clone)]
pub struct Analysis {
    pub asl: Asl,
    /// all generated candidates (pre-resolution)
    pub candidates: Vec<Candidate>,
    pub accepted: Vec<Candidate>,
    pub rejected: Vec<RejectedCandidate>,
    pub output: String,
    pub trace: Vec<TraceEvent>,
}

/// Reusable compressor with pre-loaded rule packs.
pub struct Compressor {
    rules: RuleSet,
}

impl Compressor {
    pub fn new(
        lang: Option<&str>,
        rules_path: Option<&std::path::Path>,
    ) -> Result<Self, CompressError> {
        Ok(Compressor {
            rules: load_rules(lang, rules_path)?,
        })
    }

    pub fn rules(&self) -> &RuleSet {
        &self.rules
    }

    pub fn compress(
        &self,
        input: &str,
        config: &CompressConfig,
    ) -> Result<CompressResult, CompressError> {
        compress_internal(input, config, &self.rules, true)
    }

    pub fn analyze(&self, input: &str, config: &CompressConfig) -> Analysis {
        analyze_internal(input, config, &self.rules)
    }
}

/// Compresses `input` (§25). Loads rules per call; use [`Compressor`] when
/// compressing repeatedly.
pub fn compress(input: &str, config: CompressConfig) -> Result<CompressResult, CompressError> {
    let rules = load_rules(config.lang.as_deref(), config.rules_path.as_deref())?;
    compress_internal(input, &config, &rules, true)
}

/// Runs parse -> classify -> candidate generation -> resolution -> write.
/// No safety fallback here; `compress_internal` owns that.
fn analyze_internal(input: &str, config: &CompressConfig, rules: &RuleSet) -> Analysis {
    // phase 0: parse
    let mut asl = parse(input);

    // phases 1-2: classification
    classify::classify(&mut asl, rules);

    let ctx = MatchContext {
        input,
        alias_map: &rules.alias_map,
        action_words: rules
            .packs
            .iter()
            .flat_map(|p| p.action_words.iter().cloned())
            .collect(),
    };

    let all_rules: Vec<RuleJson> = rules
        .packs
        .iter()
        .flat_map(|p| p.rules.iter().cloned())
        .collect();

    let mut candidates: Vec<Candidate> = Vec::new();

    // phase 3: code-fenced structured formats
    if config.enable_codefence_formats {
        let fmt_enabled = |name: &str| {
            rules
                .shared
                .codefence_formats
                .get(name)
                .copied()
                .unwrap_or(false)
        };
        candidates.extend(transforms::codefence_json::generate(
            &asl,
            input,
            fmt_enabled("json"),
        ));
        candidates.extend(transforms::codefence_css::generate(
            &asl,
            input,
            fmt_enabled("css"),
        ));
        candidates.extend(transforms::codefence_html::generate(
            &asl,
            input,
            fmt_enabled("html"),
        ));
    }

    // phase 4: exact consecutive repeat lines
    candidates.extend(transforms::repeat_lines::generate(&asl, input));

    // phases 5-8: JSON-rule-driven candidates
    candidates.extend(transforms::contractions::generate(&asl, &ctx, &all_rules));
    candidates.extend(transforms::politeness::generate(&asl, &ctx, &all_rules));
    let det = transforms::det_filler::generate(&asl, &ctx, &all_rules);
    let bad = transforms::bad_words::generate(&asl, &ctx, &all_rules);
    let mut word_removals = det;
    word_removals.extend(bad);
    candidates.extend(transforms::det_filler::prevent_empty_sentences(
        &asl,
        word_removals,
    ));

    // phase 9: markdown tables
    if config.enable_markdown && rules.shared.markdown.table_compress {
        candidates.extend(transforms::markdown_table::generate(&asl, input, true));
    }

    // phase 10: punctuation + blank lines
    candidates.extend(transforms::punctuation::generate(
        &asl,
        input,
        rules.shared.markdown.final_period,
        config.enable_markdown && rules.shared.markdown.blank_line_collapse,
    ));

    // phase 11: paths
    candidates.extend(transforms::paths::generate(&asl, &ctx, &all_rules));

    // phase 12: docstrings
    candidates.extend(transforms::docstrings::generate(
        &asl,
        input,
        rules.shared.markdown.docstring_collapse,
    ));

    // phase 13: resolve
    for (i, c) in candidates.iter_mut().enumerate() {
        c.id = i as u32;
    }
    let generated = candidates.clone();
    let (accepted, rejected) = rules::resolver::resolve(&asl, candidates);

    // phase 14: write
    let (output, trace) = rules::writer::write(input, &asl, &accepted);

    Analysis {
        asl,
        candidates: generated,
        accepted,
        rejected,
        output,
        trace,
    }
}

fn compress_internal(
    input: &str,
    config: &CompressConfig,
    rules: &RuleSet,
    check_idempotence: bool,
) -> Result<CompressResult, CompressError> {
    let analysis = analyze_internal(input, config, rules);
    let generated = analysis.candidates.len();
    let accepted_count = analysis.accepted.len();
    let output = analysis.output.clone();
    let trace = analysis.trace.clone();

    // phase 15: final safety checks (§23)
    let mut violations = safety::check_output(input, &output, &analysis.asl, &analysis.accepted);
    let mut final_output = output;
    if !violations.is_empty() {
        final_output = input.to_string();
    } else if check_idempotence {
        let twice = compress_internal(&final_output, config, rules, false)?;
        if twice.output != final_output {
            violations.push("idempotence check failed".to_string());
            final_output = input.to_string();
        }
    }
    let fell_back = !violations.is_empty();

    let mut metrics = Metrics {
        input_bytes: input.len(),
        output_bytes: final_output.len(),
        candidates_generated: generated,
        candidates_accepted: if fell_back { 0 } else { accepted_count },
        candidates_rejected: analysis.rejected.len(),
        safety_violations: violations.len(),
        ..Default::default()
    };
    if let Some(TokenCounterKind::Simple) = config.token_counter {
        metrics.input_tokens = Some(metrics::simple_token_count(&parse(input)));
        metrics.output_tokens = Some(metrics::simple_token_count(&parse(&final_output)));
    }

    Ok(CompressResult {
        output: final_output,
        trace: if config.emit_trace && !fell_back {
            trace
        } else {
            Vec::new()
        },
        rejected: if config.emit_rejected_candidates {
            analysis.rejected
        } else {
            Vec::new()
        },
        metrics,
        asl_debug: if config.emit_trace {
            Some(analysis.asl)
        } else {
            None
        },
    })
}
