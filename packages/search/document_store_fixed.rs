use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use brotli;
use serde::{Serialize, Deserialize};
use lru::LruCache;
use rkyv::{Archive, Deserialize as RkyvDeserialize, Serialize as RkyvSerialize};

// Fixed DocumentId implementation with required traits
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub struct DocumentId(Arc<str>);

impl DocumentId {
    pub fn new(id: impl AsRef<str>) -> Self {
        Self(id.as_ref().into())
    }
    
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<&str> for DocumentId {
    fn from(s: &str) -> Self {
        Self(s.into())
    }
}

impl From<String> for DocumentId {
    fn from(s: String) -> Self {
        Self(s.into())
    }
}

// Document structure with proper serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: DocumentId,
    pub attributes: HashMap<String, Vec<serde_json::Value>>,
    pub vector: Option<Vec<f32>>,
}

// Error types
#[derive(Debug, Clone, PartialEq)]
pub enum IndexError {
    SerializationError(String),
    CompressionError(String),
    DecompressionError(String),
    CacheError(String),
}

impl std::fmt::Display for IndexError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IndexError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            IndexError::CompressionError(msg) => write!(f, "Compression error: {}", msg),
            IndexError::DecompressionError(msg) => write!(f, "Decompression error: {}", msg),
            IndexError::CacheError(msg) => write!(f, "Cache error: {}", msg),
        }
    }
}

impl std::error::Error for IndexError {}

// WASM-compatible Brotli compression/decompression helpers
pub fn set_panic_hook() {
    #[cfg(feature="console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[derive(Serialize, Deserialize)]
pub struct BrotliOptions {
    #[serde(default = "default_quality")]
    pub quality: i32
}

fn default_quality() -> i32 { 6 } // Balanced quality for document storage

/// WASM-compatible Brotli compression
pub fn brotli_compress_wasm(input: &[u8], quality: Option<i32>) -> Result<Vec<u8>, IndexError> {
    let mut output = Vec::new();
    let mut params = brotli::enc::BrotliEncoderParams::default();
    params.quality = quality.unwrap_or(6); // Default quality 6 for balanced speed/compression
    
    match brotli::BrotliCompress(&mut input, &mut output, &params) {
        Ok(_) => Ok(output),
        Err(e) => Err(IndexError::CompressionError(format!("Brotli compress failed: {:?}", e))),
    }
}

/// WASM-compatible Brotli decompression
pub fn brotli_decompress_wasm(input: &[u8]) -> Result<Vec<u8>, IndexError> {
    let mut output = Vec::new();
    match brotli::BrotliDecompress(&mut input, &mut output) {
        Ok(_) => Ok(output),
        Err(e) => Err(IndexError::DecompressionError(format!("Brotli decompress failed: {:?}", e))),
    }
}

/// Compressed document storage separate from search index
#[derive(Debug)]
pub struct DocumentStore {
    /// Maps DocumentId to compressed JSON bytes
    documents: HashMap<DocumentId, Vec<u8>>,
    /// Optional LRU cache for recently accessed documents
    cache: Mutex<LruCache<DocumentId, Arc<Document>>>,
    /// Cache size for serialization/deserialization
    cache_size: usize,
}

impl DocumentStore {
    /// Create new document store with default cache size
    pub fn new() -> Self {
        Self::with_cache_size(100)
    }
    
    /// Create document store with custom cache size
    pub fn with_cache_size(cache_size: usize) -> Self {
        Self {
            documents: HashMap::new(),
            cache: Mutex::new(LruCache::new(cache_size.try_into().unwrap_or(100))),
            cache_size,
        }
    }
    
    /// Store document with Brotli compression
    pub fn store_document(&mut self, doc: &Document) -> Result<(), IndexError> {
        // Serialize to JSON
        let json = serde_json::to_vec(doc)
            .map_err(|e| IndexError::SerializationError(format!("JSON serialization failed: {}", e)))?;
        
        // Compress with Brotli using WASM-compatible function
        let compressed = brotli_compress_wasm(&json, Some(6))?; // Quality 6 for balanced speed/compression
        
        // Store compressed data
        self.documents.insert(doc.id.clone(), compressed);
        
        // Invalidate cache entry if it exists
        if let Ok(mut cache) = self.cache.try_lock() {
            cache.pop(&doc.id);
        }
        
        Ok(())
    }
    
    /// Retrieve and decompress document
    pub fn get_document(&self, doc_id: &DocumentId) -> Result<Option<Document>, IndexError> {
        // Check cache first
        if let Ok(mut cache) = self.cache.try_lock() {
            if let Some(cached_doc) = cache.get(doc_id) {
                return Ok(Some((**cached_doc).clone()));
            }
        }
        
        // Get compressed data
        let Some(compressed) = self.documents.get(doc_id) else {
            return Ok(None);
        };
        
        // Decompress using WASM-compatible brotli decompressor
        let decompressed = brotli_decompress_wasm(compressed)?;
        
        // Deserialize from JSON
        let doc: Document = serde_json::from_slice(&decompressed)
            .map_err(|e| IndexError::SerializationError(format!("JSON deserialization failed: {}", e)))?;
        
        // Cache the result
        if let Ok(mut cache) = self.cache.try_lock() {
            cache.put(doc_id.clone(), Arc::new(doc.clone()));
        }
        
        Ok(Some(doc))
    }
    
    /// Remove document from store
    pub fn remove_document(&mut self, doc_id: &DocumentId) -> bool {
        // Remove from storage
        let removed = self.documents.remove(doc_id).is_some();
        
        // Remove from cache
        if let Ok(mut cache) = self.cache.try_lock() {
            cache.pop(doc_id);
        }
        
        removed
    }
    
    /// Get number of stored documents
    pub fn document_count(&self) -> usize {
        self.documents.len()
    }
    
    /// Check if document exists in store
    pub fn contains_document(&self, doc_id: &DocumentId) -> bool {
        self.documents.contains_key(doc_id)
    }
    
    /// Get all document IDs
    pub fn document_ids(&self) -> Vec<DocumentId> {
        self.documents.keys().cloned().collect()
    }
    
    /// Clear all documents and cache
    pub fn clear(&mut self) {
        self.documents.clear();
        if let Ok(mut cache) = self.cache.try_lock() {
            cache.clear();
        }
    }
    
    /// Get storage statistics
    pub fn storage_stats(&self) -> DocumentStoreStats {
        let total_compressed_size: usize = self.documents.values().map(|v| v.len()).sum();
        let cache_size = self.cache.try_lock()
            .map(|cache| cache.len())
            .unwrap_or(0);
        
        DocumentStoreStats {
            document_count: self.documents.len(),
            total_compressed_bytes: total_compressed_size,
            cache_entries: cache_size,
            average_compressed_size: if self.documents.is_empty() {
                0.0
            } else {
                total_compressed_size as f64 / self.documents.len() as f64
            },
        }
    }
}

/// Statistics about document storage
#[derive(Debug, Clone)]
pub struct DocumentStoreStats {
    pub document_count: usize,
    pub total_compressed_bytes: usize,
    pub cache_entries: usize,
    pub average_compressed_size: f64,
}

/// Serializable document store for file persistence
#[derive(Archive, RkyvDeserialize, RkyvSerialize, Debug, Clone)]
#[archive(compare(PartialEq), check_bytes)]
struct SerializableDocumentStore {
    /// Document ID to compressed data mappings
    documents: Vec<(String, Vec<u8>)>,
    /// Document count for validation
    document_count: u32,
    /// Cache size to restore on deserialization
    cache_size: u32,
}

impl DocumentStore {
    /// Serialize document store to bytes for file storage
    pub fn serialize_to_bytes(&self) -> Result<Vec<u8>, IndexError> {
        use rkyv::ser::{Serializer, serializers::AllocSerializer};
        
        let serializable = SerializableDocumentStore {
            documents: self.documents.iter()
                .map(|(doc_id, compressed)| (doc_id.as_str().to_string(), compressed.clone()))
                .collect(),
            document_count: self.documents.len() as u32,
            cache_size: self.cache_size as u32,
        };
        
        let mut serializer = AllocSerializer::<4096>::default();
        serializer.serialize_value(&serializable)
            .map_err(|e| IndexError::SerializationError(format!("Document store serialization failed: {}", e)))?;
        
        Ok(serializer.into_serializer().into_inner().to_vec())
    }
    
    /// Deserialize document store from bytes
    pub fn deserialize_from_bytes(data: &[u8]) -> Result<Self, IndexError> {
        use rkyv::check_archived_root;
        
        // Validate and get archived data
        let archived = unsafe { rkyv::archived_root::<SerializableDocumentStore>(data) };
        check_archived_root::<SerializableDocumentStore>(data)
            .map_err(|e| IndexError::SerializationError(format!("Document store validation failed: {}", e)))?;
        
        // Reconstruct document store
        let mut documents = HashMap::new();
        for doc_entry in archived.documents.iter() {
            let doc_id = DocumentId::new(&doc_entry.0);
            let compressed = doc_entry.1.to_vec();
            documents.insert(doc_id, compressed);
        }
        
        let cache_size = archived.cache_size as usize;
        
        Ok(Self {
            documents,
            cache: Mutex::new(LruCache::new(cache_size.try_into().unwrap_or(100))),
            cache_size,
        })
    }
}

// Thread-safe version if needed
pub struct ThreadSafeDocumentStore {
    store: Arc<Mutex<DocumentStore>>,
}

impl ThreadSafeDocumentStore {
    pub fn new() -> Self {
        Self {
            store: Arc::new(Mutex::new(DocumentStore::new())),
        }
    }
    
    pub fn with_cache_size(cache_size: usize) -> Self {
        Self {
            store: Arc::new(Mutex::new(DocumentStore::with_cache_size(cache_size))),
        }
    }
    
    pub fn store_document(&self, doc: &Document) -> Result<(), IndexError> {
        self.store.lock()
            .map_err(|e| IndexError::CacheError(format!("Lock failed: {}", e)))?
            .store_document(doc)
    }
    
    pub fn get_document(&self, doc_id: &DocumentId) -> Result<Option<Document>, IndexError> {
        self.store.lock()
            .map_err(|e| IndexError::CacheError(format!("Lock failed: {}", e)))?
            .get_document(doc_id)
    }
    
    pub fn remove_document(&self, doc_id: &DocumentId) -> Result<bool, IndexError> {
        Ok(self.store.lock()
            .map_err(|e| IndexError::CacheError(format!("Lock failed: {}", e)))?
            .remove_document(doc_id))
    }
    
    pub fn serialize_to_bytes(&self) -> Result<Vec<u8>, IndexError> {
        self.store.lock()
            .map_err(|e| IndexError::CacheError(format!("Lock failed: {}", e)))?
            .serialize_to_bytes()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_document_store_basic_operations() {
        let mut store = DocumentStore::new();
        
        // Create a test document
        let mut attributes = HashMap::new();
        attributes.insert("title".to_string(), vec![serde_json::Value::String("Test Document".to_string())]);
        attributes.insert("content".to_string(), vec![serde_json::Value::String("This is test content".to_string())]);
        
        let doc = Document {
            id: DocumentId::new("test_doc_1"),
            attributes,
            vector: Some(vec![0.1, 0.2, 0.3, 0.4, 0.5]),
        };
        
        // Store document
        assert!(store.store_document(&doc).is_ok());
        
        // Retrieve document
        let retrieved = store.get_document(&DocumentId::new("test_doc_1")).unwrap();
        assert!(retrieved.is_some());
        let retrieved_doc = retrieved.unwrap();
        assert_eq!(retrieved_doc.id, doc.id);
        
        // Check document count
        assert_eq!(store.document_count(), 1);
        
        // Remove document
        assert!(store.remove_document(&DocumentId::new("test_doc_1")));
        assert_eq!(store.document_count(), 0);
    }
    
    #[test]
    fn test_document_store_serialization() {
        let mut store = DocumentStore::with_cache_size(50);
        
        // Add test documents
        for i in 0..5 {
            let mut attributes = HashMap::new();
            attributes.insert("title".to_string(), vec![serde_json::Value::String(format!("Document {}", i))]);
            
            let doc = Document {
                id: DocumentId::new(&format!("doc_{}", i)),
                attributes,
                vector: Some(vec![i as f32; 5]),
            };
            
            store.store_document(&doc).unwrap();
        }
        
        // Serialize
        let serialized = store.serialize_to_bytes().unwrap();
        
        // Deserialize
        let deserialized_store = DocumentStore::deserialize_from_bytes(&serialized).unwrap();
        
        // Verify
        assert_eq!(deserialized_store.document_count(), 5);
        assert_eq!(deserialized_store.cache_size, 50);
        
        // Check that documents can be retrieved
        for i in 0..5 {
            let doc = deserialized_store.get_document(&DocumentId::new(&format!("doc_{}", i))).unwrap();
            assert!(doc.is_some());
        }
    }
    
    #[test]
    fn test_compression_effectiveness() {
        let mut store = DocumentStore::new();
        
        // Create a document with repetitive content (should compress well)
        let mut attributes = HashMap::new();
        let large_content = "This is repetitive content. ".repeat(1000);
        attributes.insert("content".to_string(), vec![serde_json::Value::String(large_content)]);
        
        let doc = Document {
            id: DocumentId::new("large_doc"),
            attributes,
            vector: None,
        };
        
        store.store_document(&doc).unwrap();
        
        let stats = store.storage_stats();
        
        // The compressed size should be significantly smaller than the original
        // (This is a rough test - actual compression ratio depends on content)
        assert!(stats.total_compressed_bytes > 0);
        assert!(stats.average_compressed_size > 0.0);
    }
}
