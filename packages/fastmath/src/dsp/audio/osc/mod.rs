pub mod sine;
pub mod saw;
pub mod triangle;
pub mod square;

// Re-export the wasm-bindgen functions
pub use sine::sine;
pub use saw::saw;
pub use triangle::triangle;
pub use square::square;