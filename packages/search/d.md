impl Schema {
    /// Add a new field to existing schema
    pub fn add_field(&mut self, name: impl Into<String>, kind: Kind, semantic: SemanticKind) -> Result<(), SchemaError> {
        let name_str = name.into();
        
        if self.attributes.contains_key(&name_str) {
            return Err(SchemaError::FieldAlreadyExists);
        }
        
        self.attributes.insert(name_str.clone(), kind);
        self.semantic_kinds.insert(name_str.clone(), semantic);
        
        if matches!(kind, Kind::Text) {
            self.field_weights.insert(name_str, semantic.to_field_weight());
        }
        
        Ok(())
    }
}

impl HybridSearchEngine {
    /// Add a field to the schema and update all components
    pub fn add_schema_field(&mut self, name: impl Into<String>, kind: Kind, semantic: SemanticKind) -> Result<(), IndexError> {
        let name_str = name.into();
        
        // Update schema (if we had a mutable reference)
        // self.schema.add_field(&name_str, kind, semantic)?;
        
        // Update BM25 config with new field weight
        if matches!(kind, Kind::Text) {
            let field_weight = semantic.to_field_weight();
            let attr_idx = self.collection.get_or_register_attribute(&name_str, &Value::Text(String::new()))?;
            self.text_index.scorer.register_field(&name_str, attr_idx, field_weight.weight);
        }
        
        Ok(())
    }
}