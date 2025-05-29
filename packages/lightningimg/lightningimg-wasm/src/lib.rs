use wasm_bindgen::prelude::*;
use image::{ImageReader, DynamicImage, ImageFormat};
use std::io::Cursor;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

/// Resize an image using high-quality resampling algorithm
fn resize_image(image: &DynamicImage, width: Option<u32>, height: Option<u32>) -> Result<DynamicImage, JsValue> {
    let (current_width, current_height) = (image.width(), image.height());
    
    // Calculate target dimensions
    let (target_width, target_height) = match (width, height) {
        // Both width and height specified
        (Some(w), Some(h)) => (w, h),
        // Only width specified - maintain aspect ratio
        (Some(w), None) => {
            let aspect_ratio = current_height as f64 / current_width as f64;
            let h = (w as f64 * aspect_ratio).round() as u32;
            (w, h)
        },
        // Only height specified - maintain aspect ratio
        (None, Some(h)) => {
            let aspect_ratio = current_width as f64 / current_height as f64;
            let w = (h as f64 * aspect_ratio).round() as u32;
            (w, h)
        },
        // Neither specified - return original
        (None, None) => return Ok(image.clone()),
    };
    
    // Use high-quality Lanczos3 filter for resizing
    let resized = image.resize(target_width, target_height, image::imageops::FilterType::Lanczos3);
    Ok(resized)
}

/// Encodes a `DynamicImage` to WebP format.
fn encode_webp(image: &DynamicImage) -> Result<Vec<u8>, JsValue> {
    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);
    
    // Use the image crate's WebP encoder
    image.write_to(&mut cursor, ImageFormat::WebP)
        .map_err(|e| JsValue::from_str(&format!("WebP encoding error: {}", e)))?;
    
    Ok(buffer)
}

/// Converts an image buffer to WebP format.
/// This is the core function that browsers and Node.js can use.
#[wasm_bindgen]
pub fn convert_image_buffer(input_buffer: &[u8], width: Option<u32>, height: Option<u32>) -> Result<Vec<u8>, JsValue> {
    let image_reader = ImageReader::new(Cursor::new(input_buffer))
        .with_guessed_format()
        .map_err(|e| JsValue::from_str(&format!("Failed to read image: {}", e)))?;
    
    let image = image_reader.decode()
        .map_err(|e| JsValue::from_str(&format!("Failed to decode image: {}", e)))?;
    
    let resized_image = resize_image(&image, width, height)?;
    encode_webp(&resized_image)
}

/// Determines if an image format is supported based on the first few bytes.
#[wasm_bindgen]
pub fn is_supported_format(buffer: &[u8]) -> bool {
    if buffer.len() < 12 {
        return false;
    }
    
    // PNG signature
    if buffer.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
        return true;
    }
    
    // JPEG signature
    if buffer.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return true;
    }
    
    // TIFF signatures (little and big endian)
    if buffer.starts_with(&[0x49, 0x49, 0x2A, 0x00]) || buffer.starts_with(&[0x4D, 0x4D, 0x00, 0x2A]) {
        return true;
    }
    
    // GIF signatures
    if buffer.starts_with(b"GIF87a") || buffer.starts_with(b"GIF89a") {
        return true;
    }
    
    // BMP signature
    if buffer.starts_with(b"BM") {
        return true;
    }
    
    false
}

/// Get image format information from buffer
#[wasm_bindgen]
pub fn get_image_info(buffer: &[u8]) -> Result<JsValue, JsValue> {
    let image_reader = ImageReader::new(Cursor::new(buffer))
        .with_guessed_format()
        .map_err(|e| JsValue::from_str(&format!("Failed to read image: {}", e)))?;
    
    let format = image_reader.format()
        .ok_or_else(|| JsValue::from_str("Unknown image format"))?;
    
    let image = image_reader.decode()
        .map_err(|e| JsValue::from_str(&format!("Failed to decode image: {}", e)))?;
    
    let info = js_sys::Object::new();
    js_sys::Reflect::set(&info, &"format".into(), &format_to_string(format).into())?;
    js_sys::Reflect::set(&info, &"width".into(), &(image.width() as u32).into())?;
    js_sys::Reflect::set(&info, &"height".into(), &(image.height() as u32).into())?;
    
    Ok(info.into())
}

fn format_to_string(format: ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "PNG",
        ImageFormat::Jpeg => "JPEG",
        ImageFormat::Gif => "GIF",
        ImageFormat::Tiff => "TIFF",
        ImageFormat::Bmp => "BMP",
        ImageFormat::WebP => "WebP",
        _ => "Unknown",
    }
}

// Node.js-style file system operations (when available)
/// Processes all images in a directory recursively, converting them to WebP format.
/// This function is designed to work in Node.js environments where fs module is available.
#[wasm_bindgen]
pub fn process_directory(_input_dir: &str, _output_dir: Option<String>) -> Result<(), JsValue> {
    // This will be implemented via JavaScript wrapper that checks for Node.js environment
    Err(JsValue::from_str("process_directory should be called through the JavaScript wrapper"))
}

/// Processes all images in a directory recursively, converting them to WebP format and optionally keeping original file names.
#[wasm_bindgen]
pub fn process_directory_destructive(_input_dir: &str, _keep_original_names: Option<bool>) -> Result<(), JsValue> {
    // This will be implemented via JavaScript wrapper that checks for Node.js environment
    Err(JsValue::from_str("process_directory_destructive should be called through the JavaScript wrapper"))
}
