//! defuss-semantic-compress: deterministic, safe-only semantic compressor
//! for LLM input text.
//!
//! Architecture (see implementation-plan.md §33 and the v2 update):
//!
//! ```text
//! input text
//!   -> lossless ASL parse
//!   -> classification
//!   -> rule matching on immutable node graph
//!   -> candidate transformations
//!   -> confidence filter + compression budget
//!   -> conflict resolver (interval index)
//!   -> WritePlan built from original input
//!   -> final writer output
//! ```
//!
//! Rules never mutate text. Rules emit candidates. Candidates target
//! immutable ASL node spans. The WritePlan is built from the original
//! input. The conflict resolver chooses safe deterministic winners. Only
//! resolved candidates affect output.

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
pub use config::{CompressConfig, ParseStrategy, ParserMode, TokenCounterKind};
pub use error::{CompressError, SchemaVersionError, ValidationFailure};
pub use metrics::{Metrics, SectionMetrics};
pub use parse::{parse, parse_with};
pub use render::render;
pub use rules::budget::{apply_confidence_filter, enforce_budget};
pub use rules::candidate::{Candidate, CandidateKind, Phase, SafetyClass, TransformLayer};
pub use rules::loader::{
    load_rules, validate_rule_pack, validate_schema_version, RulePack, RuleSet, RuleSource,
    SUPPORTED_SCHEMA_VERSION,
};
pub use rules::writer::WritePlan;
pub use span::Span;
pub use trace::{RejectedCandidate, TraceEvent};

use rules::matcher::MatchContext;
use rules::schema::RuleJson;

#[derive(Debug, Clone)]
pub struct CompressResult {
    pub output: String,
    pub trace: Vec<TraceEvent>,
    pub rejected: Vec<RejectedCandidate>,
    pub metrics: Metrics,
    pub asl_debug: Option<Asl>,
    /// Always true for safe mode (§19.4): the output is a fixpoint, either
    /// because idempotence verified or because the safety fallback engaged.
    pub idempotent: bool,
    /// True when zero candidates were applied (§19.2 no-op detection).
    pub no_candidates_applied: bool,
}

/// Full pipeline inspection (parse tree, generated candidates, resolution).
/// Used by integration tests and the CLI's `--debug-candidates`/`--dry-run`.
#[derive(Debug, Clone)]
pub struct Analysis {
    pub asl: Asl,
    /// all generated candidates (pre-resolution, pre-filters)
    pub candidates: Vec<Candidate>,
    /// candidates downgraded to Review by the confidence filter / budget
    pub review: Vec<Candidate>,
    pub accepted: Vec<Candidate>,
    pub rejected: Vec<RejectedCandidate>,
    pub plan: WritePlan,
    pub output: String,
    pub trace: Vec<TraceEvent>,
    pub sections: Vec<SectionMetrics>,
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
        Self::with_extra_rules(lang, rules_path, &[])
    }

    pub fn with_extra_rules(
        lang: Option<&str>,
        rules_path: Option<&std::path::Path>,
        extra_rules: &[std::path::PathBuf],
    ) -> Result<Self, CompressError> {
        Ok(Compressor {
            rules: load_rules(lang, rules_path, extra_rules)?,
        })
    }

    pub fn from_config(config: &CompressConfig) -> Result<Self, CompressError> {
        Self::with_extra_rules(
            config.lang.as_deref(),
            config.rules_path.as_deref(),
            &config.extra_rules,
        )
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

    pub fn analyze(&self, input: &str, config: &CompressConfig) -> Result<Analysis, CompressError> {
        analyze_internal(input, config, &self.rules)
    }
}

/// Compresses `input` (§21). Loads rules per call; use [`Compressor`] when
/// compressing repeatedly.
pub fn compress(input: &str, config: CompressConfig) -> Result<CompressResult, CompressError> {
    let rules = load_rules(
        config.lang.as_deref(),
        config.rules_path.as_deref(),
        &config.extra_rules,
    )?;
    compress_internal(input, &config, &rules, true)
}

/// Compresses each top-level chunk independently and merges the results
/// (§25). Chunks are split at blank lines outside code fences, so fenced
/// regions never straddle a boundary.
pub fn compress_chunked(
    input: &str,
    config: CompressConfig,
) -> Result<CompressResult, CompressError> {
    let rules = load_rules(
        config.lang.as_deref(),
        config.rules_path.as_deref(),
        &config.extra_rules,
    )?;
    let chunks = chunk_spans(input);
    if chunks.len() <= 1 {
        return compress_internal(input, &config, &rules, true);
    }

    let mut output = String::with_capacity(input.len());
    let mut trace = Vec::new();
    let mut rejected = Vec::new();
    let mut metrics = Metrics::default();
    let mut all_sections = Vec::new();
    let mut no_applied = true;

    for (start, end) in chunks {
        let chunk = &input[start..end];
        // per-chunk safety checks already enforce budget/idempotence
        let result = compress_internal(chunk, &config, &rules, true)?;
        output.push_str(&result.output);
        // re-base spans into document coordinates
        trace.extend(result.trace.into_iter().map(|mut t| {
            t.span = Span::new(t.span.start + start, t.span.end + start);
            t
        }));
        rejected.extend(result.rejected.into_iter().map(|mut r| {
            r.span = Span::new(r.span.start + start, r.span.end + start);
            r
        }));
        all_sections.extend(result.metrics.sections);
        if result.metrics.candidates_accepted > 0 {
            no_applied = false;
        }
        metrics.candidates_generated += result.metrics.candidates_generated;
        metrics.candidates_accepted += result.metrics.candidates_accepted;
        metrics.candidates_rejected += result.metrics.candidates_rejected;
        metrics.safety_violations += result.metrics.safety_violations;
    }

    metrics.input_bytes = input.len();
    metrics.output_bytes = output.len();
    metrics.sections = all_sections;
    if let Some(TokenCounterKind::Simple) = config.token_counter {
        metrics.input_tokens = Some(metrics::simple_token_count(&parse(input)));
        metrics.output_tokens = Some(metrics::simple_token_count(&parse(&output)));
    }

    Ok(CompressResult {
        output,
        trace: if config.emit_trace { trace } else { Vec::new() },
        rejected: if config.emit_rejected_candidates {
            rejected
        } else {
            Vec::new()
        },
        metrics,
        asl_debug: None,
        idempotent: true,
        no_candidates_applied: no_applied,
    })
}

/// Splits input into (start, end) chunk spans at blank lines that are not
/// inside code fences. Each chunk keeps its trailing separators.
fn chunk_spans(input: &str) -> Vec<(usize, usize)> {
    use parse::block::split_lines;
    use parse::codefence::{fence_close, fence_open};
    let lines = split_lines(input);
    let mut spans = Vec::new();
    let mut chunk_start = 0usize;
    let mut in_fence: Option<(char, usize)> = None;
    for line in &lines {
        let text = line.text(input);
        match in_fence {
            Some((fc, fl)) => {
                if fence_close(text, fc, fl) {
                    in_fence = None;
                }
            }
            None => {
                if let Some((fc, fl, _)) = fence_open(text) {
                    in_fence = Some((fc, fl));
                } else if line.is_blank(input) && line.nl_end > chunk_start {
                    spans.push((chunk_start, line.nl_end));
                    chunk_start = line.nl_end;
                }
            }
        }
    }
    if chunk_start < input.len() {
        spans.push((chunk_start, input.len()));
    }
    spans
}

/// Runs parse -> classify -> candidate generation -> confidence filter ->
/// budget -> resolution -> WritePlan. No safety fallback here;
/// `compress_internal` owns that.
fn analyze_internal(
    input: &str,
    config: &CompressConfig,
    rules: &RuleSet,
) -> Result<Analysis, CompressError> {
    // phase 0: parse
    let mut asl = parse_with(input, config.parse_strategy, config.parser_mode)?;

    // phases 1-2: classification
    classify::classify(&mut asl, rules);

    let ctx = MatchContext::new(
        input,
        &rules.alias_map,
        rules
            .packs
            .iter()
            .flat_map(|p| p.action_words.iter().cloned())
            .collect(),
    );

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

    for (i, c) in candidates.iter_mut().enumerate() {
        c.id = i as u32;
    }
    let generated = candidates.clone();

    // phase 13: confidence filter
    let mut review = apply_confidence_filter(&mut candidates, config.min_confidence);

    // phase 14: compression budget enforcement
    review.extend(enforce_budget(&asl, input, &mut candidates, config));

    // phase 15: resolve
    let (accepted, rejected) = rules::resolver::resolve(&asl, candidates);

    // phase 16: WritePlan
    let (mut plan, mut trace) = rules::writer::plan(input, &asl, &accepted);

    // Review candidates participate in trace emission only (§15.1.3)
    for cand in &review {
        trace.push(TraceEvent {
            rule_id: cand.rule_id.clone(),
            phase: cand.phase.as_str().to_string(),
            kind: CandidateKind::Review.as_str().to_string(),
            layer: cand.layer.as_str().to_string(),
            before: input[cand.target_span.start..cand.target_span.end].to_string(),
            after: cand.replacement.clone().unwrap_or_default(),
            span: cand.target_span,
            node_ids: cand.target_nodes.clone(),
            priority: cand.priority,
        });
    }

    let sections = metrics::compute_sections(&asl, &generated, &accepted);
    plan.unchanged_sections = sections
        .iter()
        .filter(|s| s.candidates_applied == 0)
        .cloned()
        .collect();

    let output = plan.assemble(input);

    Ok(Analysis {
        asl,
        candidates: generated,
        review,
        accepted,
        rejected,
        plan,
        output,
        trace,
        sections,
    })
}

fn compress_internal(
    input: &str,
    config: &CompressConfig,
    rules: &RuleSet,
    check_idempotence: bool,
) -> Result<CompressResult, CompressError> {
    let analysis = analyze_internal(input, config, rules)?;
    let generated = analysis.candidates.len();
    let accepted_count = analysis.accepted.len();
    let output = analysis.output.clone();
    let mut trace = analysis.trace.clone();

    // phase 17: final safety checks (§19.2)
    let mut violations = safety::check_output(input, &output, &analysis.asl, &analysis.accepted, config);
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

    let no_candidates_applied = accepted_count == 0 || fell_back;
    // no-op detection (§19.2): emit a trace event when nothing was applied
    if no_candidates_applied && config.emit_trace {
        trace.push(TraceEvent {
            rule_id: "shared.no_candidates".to_string(),
            phase: Phase::SafetyCheck.as_str().to_string(),
            kind: CandidateKind::Review.as_str().to_string(),
            layer: TransformLayer::Block.as_str().to_string(),
            before: String::new(),
            after: String::new(),
            span: Span::new(0, 0),
            node_ids: Vec::new(),
            priority: 0,
        });
    }

    let mut metrics = Metrics {
        input_bytes: input.len(),
        output_bytes: final_output.len(),
        candidates_generated: generated,
        candidates_accepted: if fell_back { 0 } else { accepted_count },
        candidates_rejected: analysis.rejected.len(),
        safety_violations: violations.len(),
        sections: analysis.sections.clone(),
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
        } else if config.emit_trace {
            // fallback: keep only the no-op event
            trace
                .into_iter()
                .filter(|t| t.rule_id == "shared.no_candidates")
                .collect()
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
        idempotent: true,
        no_candidates_applied,
    })
}
