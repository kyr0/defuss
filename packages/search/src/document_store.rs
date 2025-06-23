use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use lru::LruCache;
use bson::{Document as BsonDocument, Bson};

// Fixed DocumentId implementation with required traits
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
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

impl From<DocumentId> for Bson {
    fn from(doc_id: DocumentId) -> Self {
        Bson::String(doc_id.as_str().to_string())
    }
}

impl TryFrom<&Bson> for DocumentId {
    type Error = IndexError;
    
    fn try_from(bson: &Bson) -> Result<Self, Self::Error> {
        match bson {
            Bson::String(s) => Ok(DocumentId::new(s)),
            _ => Err(IndexError::SerializationError("Expected string for DocumentId".to_string())),
        }
    }
}

// Document structure using BSON for serialization
#[derive(Debug, Clone)]
pub struct Document {
    pub id: DocumentId,
    pub attributes: HashMap<String, Vec<Bson>>,
    pub vector: Option<Vec<f32>>,
}

impl Document {
    pub fn new(id: impl AsRef<str>) -> Self {
        Self {
            id: DocumentId::new(id),
            attributes: HashMap::new(),
            vector: None,
        }
    }
    
    pub fn attribute(mut self, name: &str, value: impl Into<Bson>) -> Self {
        self.attributes
            .entry(name.to_string())
            .or_insert_with(Vec::new)
            .push(value.into());
        self
    }
    
    pub fn with_vector(mut self, vector: Vec<f32>) -> Self {
        self.vector = Some(vector);
        self
    }
    
    /// Convert to BSON document for serialization
    pub fn to_bson_document(&self) -> Result<BsonDocument, IndexError> {
        let mut doc = BsonDocument::new();
        
        // Add document ID
        doc.insert("_id", Bson::String(self.id.as_str().to_string()));
        
        // Add attributes
        let mut attrs_doc = BsonDocument::new();
        for (key, values) in &self.attributes {
            attrs_doc.insert(key.clone(), Bson::Array(values.clone()));
        }
        doc.insert("attributes", Bson::Document(attrs_doc));
        
        // Add vector if present
        if let Some(ref vector) = self.vector {
            let vector_bson: Vec<Bson> = vector.iter().map(|&f| Bson::Double(f as f64)).collect();
            doc.insert("vector", Bson::Array(vector_bson));
        }
        
        Ok(doc)
    }
    
    /// Create from BSON document
    pub fn from_bson_document(bson_doc: &BsonDocument) -> Result<Self, IndexError> {
        // Extract document ID
        let id_bson = bson_doc.get("_id")
            .ok_or_else(|| IndexError::SerializationError("Missing _id field".to_string()))?;
        let id = DocumentId::try_from(id_bson)?;
        
        // Extract attributes
        let mut attributes = HashMap::new();
        if let Some(Bson::Document(attrs_doc)) = bson_doc.get("attributes") {
            for (key, value) in attrs_doc {
                if let Bson::Array(values) = value {
                    attributes.insert(key.clone(), values.clone());
                }
            }
        }
        
        // Extract vector
        let vector = if let Some(Bson::Array(vector_bson)) = bson_doc.get("vector") {
            let mut vector = Vec::new();
            for value in vector_bson {
                if let Bson::Double(f) = value {
                    vector.push(*f as f32);
                } else if let Bson::Int32(i) = value {
                    vector.push(*i as f32);
                } else if let Bson::Int64(i) = value {
                    vector.push(*i as f32);
                }
            }
            Some(vector)
        } else {
            None
        };
        
        Ok(Document {
            id,
            attributes,
            vector,
        })
    }
}

// Error types
#[derive(Debug, Clone, PartialEq)]
pub enum IndexError {
    SerializationError(String),
    CacheError(String),
    NotFound(String),
}

impl std::fmt::Display for IndexError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IndexError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            IndexError::CacheError(msg) => write!(f, "Cache error: {}", msg),
            IndexError::NotFound(msg) => write!(f, "Not found: {}", msg),
        }
    }
}

impl std::error::Error for IndexError {}

// Storage statistics
#[derive(Debug, Clone)]
pub struct DocumentStoreStats {
    pub document_count: usize,
    pub total_bytes: usize,
    pub cache_entries: usize,
    pub average_document_size: f64,
}

/// BSON-based document storage with LRU caching
#[derive(Debug)]
pub struct DocumentStore {
    /// Maps DocumentId to BSON-serialized bytes
    documents: HashMap<DocumentId, Vec<u8>>,
    /// Optional LRU cache for recently accessed documents
    cache: Mutex<LruCache<DocumentId, Arc<Document>>>,
    /// Cache size for quick access
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
            cache: Mutex::new(LruCache::new(std::num::NonZeroUsize::new(cache_size).unwrap_or(std::num::NonZeroUsize::new(100).unwrap()))),
            cache_size,
        }
    }
    
    /// Store document using BSON serialization
    pub fn store_document(&mut self, doc: &Document) -> Result<(), IndexError> {
        // Convert to BSON document
        let bson_doc = doc.to_bson_document()?;
        
        // Serialize to bytes
        let mut bytes = Vec::new();
        bson_doc.to_writer(&mut bytes)
            .map_err(|e| IndexError::SerializationError(format!("BSON serialization failed: {}", e)))?;
        
        // Store serialized data
        self.documents.insert(doc.id.clone(), bytes);
        
        // Invalidate cache entry if it exists
        if let Ok(mut cache) = self.cache.try_lock() {
            cache.pop(&doc.id);
        }
        
        Ok(())
    }
    
    /// Retrieve and deserialize document
    pub fn get_document(&self, doc_id: &DocumentId) -> Result<Option<Document>, IndexError> {
        // Check cache first
        if let Ok(mut cache) = self.cache.try_lock() {
            if let Some(cached_doc) = cache.get(doc_id) {
                return Ok(Some((**cached_doc).clone()));
            }
        }
        
        // Get serialized data
        let Some(bytes) = self.documents.get(doc_id) else {
            return Ok(None);
        };
        
        // Deserialize from BSON
        let bson_doc = BsonDocument::from_reader(&mut bytes.as_slice())
            .map_err(|e| IndexError::SerializationError(format!("BSON deserialization failed: {}", e)))?;
        
        let doc = Document::from_bson_document(&bson_doc)?;
        
        // Cache the result
        if let Ok(mut cache) = self.cache.try_lock() {
            cache.put(doc.id.clone(), Arc::new(doc.clone()));
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
        let total_bytes: usize = self.documents.values().map(|bytes| bytes.len()).sum();
        let cache_entries = if let Ok(cache) = self.cache.try_lock() {
            cache.len()
        } else {
            0
        };
        
        DocumentStoreStats {
            document_count: self.documents.len(),
            total_bytes,
            cache_entries,
            average_document_size: if self.documents.is_empty() {
                0.0
            } else {
                total_bytes as f64 / self.documents.len() as f64
            },
        }
    }
}
