#![forbid(unsafe_code)]

use brotli_decompressor::Decompressor;
use std::io::{self, Cursor, Write};
use wasm_bindgen::prelude::*;

fn to_js_error(error: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&error.to_string())
}

struct LimitedWriter {
    inner: Vec<u8>,
    max_output_size: usize,
}

impl LimitedWriter {
    fn new(max_output_size: usize) -> Self {
        Self {
            inner: Vec::new(),
            max_output_size,
        }
    }

    fn into_inner(self) -> Vec<u8> {
        self.inner
    }
}

impl Write for LimitedWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        if self.inner.len().saturating_add(buf.len()) > self.max_output_size {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!(
                    "decompressed data exceeds max_output_size ({})",
                    self.max_output_size
                ),
            ));
        }
        self.inner.extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[wasm_bindgen]
pub fn decompress_bytes(input: &[u8], max_output_size: usize) -> Result<Vec<u8>, JsValue> {
    if max_output_size == 0 {
        return Err(JsValue::from_str("max_output_size must be > 0"));
    }

    let mut reader = Decompressor::new(Cursor::new(input), 4096);
    let mut writer = LimitedWriter::new(max_output_size);
    io::copy(&mut reader, &mut writer).map_err(to_js_error)?;
    Ok(writer.into_inner())
}
