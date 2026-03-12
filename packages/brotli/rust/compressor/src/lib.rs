#![forbid(unsafe_code)]

use brotli::CompressorReader;
use std::io::{Cursor, Read};
use wasm_bindgen::prelude::*;

fn to_js_error(error: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&error.to_string())
}

#[wasm_bindgen]
pub fn compress_bytes(input: &[u8], quality: u32, lgwin: u32) -> Result<Vec<u8>, JsValue> {
    if quality > 11 {
        return Err(JsValue::from_str("quality must be between 0 and 11"));
    }
    if !(10..=24).contains(&lgwin) {
        return Err(JsValue::from_str("lgwin must be between 10 and 24"));
    }

    let mut reader = CompressorReader::new(Cursor::new(input), 4096, quality, lgwin);
    let mut output = Vec::with_capacity(input.len().saturating_div(2).saturating_add(64));
    reader.read_to_end(&mut output).map_err(to_js_error)?;
    Ok(output)
}
