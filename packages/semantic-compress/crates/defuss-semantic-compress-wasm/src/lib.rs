//! WASM bindings for defuss-semantic-compress (§26).
//!
//! Rules are always the embedded defaults (`rules_path` is not supported in
//! WASM). Field names on the JS side are camelCase.

use defuss_semantic_compress::{compress as core_compress, CompressConfig, RejectedCandidate, TraceEvent};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Installs the panic hook so Rust panics surface as readable JS errors.
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct CompressOptions {
    lang: Option<String>,
    emit_trace: bool,
    emit_rejected_candidates: bool,
    enable_markdown: Option<bool>,
    enable_code_fence_formats: Option<bool>,
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

/// Compresses `input`. Throws a `JsError` when rule loading fails.
#[wasm_bindgen]
pub fn compress(input: &str, options: JsValue) -> Result<JsValue, JsError> {
    let opts: CompressOptions = if options.is_undefined() || options.is_null() {
        CompressOptions::default()
    } else {
        serde_wasm_bindgen::from_value(options)
            .map_err(|e| JsError::new(&format!("invalid options: {e}")))?
    };
    let config = CompressConfig {
        lang: opts.lang,
        rules_path: None, // embedded rules only
        enable_markdown: opts.enable_markdown.unwrap_or(true),
        enable_codefence_formats: opts.enable_code_fence_formats.unwrap_or(true),
        emit_trace: opts.emit_trace,
        emit_rejected_candidates: opts.emit_rejected_candidates,
        token_counter: None,
    };
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
        },
    };
    serde_wasm_bindgen::to_value(&wasm).map_err(|e| JsError::new(&format!("serialize failed: {e}")))
}

#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
