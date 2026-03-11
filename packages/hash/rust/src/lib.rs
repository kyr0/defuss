#![forbid(unsafe_code)]

mod content;

pub use content::ContentHasher;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn content_hash(value: JsValue, skip_paths: JsValue) -> Result<String, JsValue> {
    content::content_hash(value, skip_paths)
}
