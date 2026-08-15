//! WASM bindings for defuss-semantic-compress (§22, v2).
//!
//! Rules are always the embedded defaults (`rules_path` is not supported in
//! WASM). Field names on the JS side are camelCase.

use defuss_semantic_compress::{
    compress as core_compress, CompressConfig, ParserMode, RejectedCandidate, TraceEvent,
};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Installs the panic hook so Rust panics surface as readable JS errors.
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct CompressOptions {
    lang: Option<String>,
    emit_trace: bool,
    emit_rejected_candidates: bool,
    enable_markdown: Option<bool>,
    enable_code_fence_formats: Option<bool>,
    /// "full" | "partial" | "minimal"
    parser_mode: Option<String>,
    min_confidence: Option<f32>,
    min_output_ratio: Option<f32>,
}

impl Default for CompressOptions {
    fn default() -> Self {
        CompressOptions {
            lang: None,
            emit_trace: false,
            emit_rejected_candidates: false,
            enable_markdown: None,
            enable_code_fence_formats: None,
            parser_mode: None,
            min_confidence: None,
            min_output_ratio: None,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WasmSectionMetrics {
    kind: String,
    input_bytes: usize,
    output_bytes: usize,
    candidates_generated: usize,
    candidates_applied: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WasmMetrics {
    input_bytes: usize,
    output_bytes: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    input_tokens: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    output_tokens: Option<usize>,
    sections: Vec<WasmSectionMetrics>,
    no_candidates_applied: bool,
    idempotent: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WasmResult {
    output: String,
    trace: Vec<TraceEvent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rejected: Option<Vec<RejectedCandidate>>,
    metrics: WasmMetrics,
}

/// Compresses `input`. Throws a `JsError` on rule load failure, parse
/// failure (strict mode) or invalid options.
#[wasm_bindgen]
pub fn compress(input: &str, options: JsValue) -> Result<JsValue, JsError> {
    let opts: CompressOptions = if options.is_undefined() || options.is_null() {
        CompressOptions::default()
    } else {
        serde_wasm_bindgen::from_value(options)
            .map_err(|e| JsError::new(&format!("invalid options: {e}")))?
    };

    let mut config = CompressConfig {
        lang: opts.lang,
        rules_path: None, // embedded rules only
        emit_trace: opts.emit_trace,
        emit_rejected_candidates: opts.emit_rejected_candidates,
        ..Default::default()
    };
    if let Some(v) = opts.enable_markdown {
        config.enable_markdown = v;
    }
    if let Some(v) = opts.enable_code_fence_formats {
        config.enable_codefence_formats = v;
    }
    if let Some(mode) = &opts.parser_mode {
        config.parser_mode = match mode.as_str() {
            "full" => ParserMode::FullProtection,
            "partial" => ParserMode::PartialProtection,
            "minimal" => ParserMode::MinimalProtection,
            _ => {
                return Err(JsError::new(&format!(
                    "invalid parserMode {mode:?} (expected full|partial|minimal)"
                )))
            }
        };
    }
    if let Some(v) = opts.min_confidence {
        config.min_confidence = v;
    }
    if let Some(v) = opts.min_output_ratio {
        config.min_output_ratio = v;
    }

    let result = core_compress(input, config).map_err(|e| JsError::new(&e.to_string()))?;
    let rejected = if opts.emit_rejected_candidates {
        Some(result.rejected)
    } else {
        None
    };
    let wasm = WasmResult {
        output: result.output,
        trace: result.trace,
        rejected,
        metrics: WasmMetrics {
            input_bytes: result.metrics.input_bytes,
            output_bytes: result.metrics.output_bytes,
            input_tokens: result.metrics.input_tokens,
            output_tokens: result.metrics.output_tokens,
            sections: result
                .metrics
                .sections
                .into_iter()
                .map(|s| WasmSectionMetrics {
                    kind: s.kind,
                    input_bytes: s.input_bytes,
                    output_bytes: s.output_bytes,
                    candidates_generated: s.candidates_generated,
                    candidates_applied: s.candidates_applied,
                })
                .collect(),
            no_candidates_applied: result.no_candidates_applied,
            idempotent: result.idempotent,
        },
    };
    serde_wasm_bindgen::to_value(&wasm).map_err(|e| JsError::new(&format!("serialize failed: {e}")))
}

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
