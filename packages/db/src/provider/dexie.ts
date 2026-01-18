import type { Dexie, Table, DexieOptions, IndexableType } from "dexie";
import type {
  DefussProvider,
  DefussRecord,
  PrimaryKeyValue,
  RecordValue,
} from "../types.js";

export type DexieProviderOptions = DexieOptions;

/**
 * DexieProvider implements DefussProvider for IndexedDB using Dexie.js.
 */
export class DexieProvider implements DefussProvider<DexieOptions> {
  db!: Dexie;
  tables: Map<string, Table<any, IndexableType>> = new Map();
  databaseName: string;
  schema: Map<string, Record<string, string>> = new Map();
  schemaVersion = 1;
  isOpen = false;

  constructor(databaseName: string) {
    if (!databaseName) {
      databaseName = "DefussDB";
    }
    this.databaseName = databaseName;
  }

  /**
   * Connects to IndexedDB. Dexie.js manages connections internally.
   * @param options - Dexie-specific configuration options.
   */
  async connect(options: DexieOptions = {}): Promise<void> {
    if (this.db && this.isConnected()) {
      return; // Already connected
    }

    const isNode =
      typeof process !== "undefined" &&
      typeof process.versions === "object" &&
      typeof process.versions.node !== "undefined";

    if (isNode) {
      // load shim for Node.js for SSR and test environments
      // @ts-ignore: no types for fake-indexeddb
      await import("fake-indexeddb/auto");
    }

    const DexieImpl: typeof Dexie = (await import("dexie"))
      .default as unknown as typeof Dexie;

    this.db = new DexieImpl(this.databaseName, options);
    this.isOpen = true;
  }

  /**
   * Disconnects from IndexedDB.
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.isOpen = false;
    }
  }

  /**
   * Checks if the provider is currently connected to the database.
   * @returns True if connected, false otherwise.
   */
  isConnected(): boolean {
    return this.isOpen;
  }

  /**
   * Creates a table if it doesn't exist with dynamic schema support.
   * @param table - The name of the table.
   */
  async createTable(table: string): Promise<void> {
    // If table already exists in our cache, no need to recreate
    if (this.tables.has(table)) return;

    // Initialize schema for this table if it doesn't exist
    if (!this.schema.has(table)) {
      this.schema.set(table, { pk: "++" }); // Start with auto-incrementing primary key
    }

    // Update the database version and schema
    this.schemaVersion++;

    // Close existing connection to apply schema changes
    if (this.isOpen) {
      this.db.close();
    }

    // Define new schema with current columns
    const tableSchema: Record<string, string> = {};
    for (const [tableName, columns] of this.schema.entries()) {
      // Convert column definition object to Dexie schema string
      const schemaString = Object.entries(columns)
        .map(([column, indexType]) => {
          if (column === "pk") return "++pk"; // Primary key is special
          return indexType ? `${indexType}${column}` : column;
        })
        .join(", ");

      tableSchema[tableName] = schemaString;
    }

    // Apply the new schema
    this.db.version(this.schemaVersion).stores(tableSchema);

    // Reopen the database to apply changes
    await this.db.open();
    this.isOpen = true;

    // Cache the table reference
    const tableDexie = this.db.table(table);
    this.tables.set(table, tableDexie);
  }

  /**
   * Adds columns to the schema if they don't exist, with proper indexing.
   * @param table - The name of the table.
   * @param record - The record with properties to consider adding.
   */
  private async ensureColumnsForRecord(
    table: string,
    record: DefussRecord,
  ): Promise<void> {
    // Get current schema or create new one
    const tableSchema = this.schema.get(table) || { pk: "++" };
    let schemaUpdated = false;

    // Check each property in the record
    for (const [prop, value] of Object.entries(record)) {
      // Skip pk (it's already handled)
      if (prop === "pk") continue;

      // Skip properties that are already in the schema
      if (prop in tableSchema) continue;

      // Check if this property should be indexed (if it ends with _index)
      if (prop.endsWith("_index")) {
        const baseField = prop.slice(0, -6);
        if (!(baseField in tableSchema)) {
          // Add the index to the schema - determine the index type
          if (Array.isArray(value)) {
            tableSchema[prop] = "*"; // Multi-valued index
          } else {
            tableSchema[prop] = ""; // Regular index
          }
          schemaUpdated = true;
        }
      } else if (!(prop in tableSchema)) {
        // Add the property as a non-indexed column
        tableSchema[prop] = "";
        schemaUpdated = true;
      }
    }

    // If schema was updated, apply changes
    if (schemaUpdated) {
      this.schema.set(table, tableSchema);
      await this.createTable(table); // This will reapply schema with new columns
    }
  }

  /**
   * Inserts a record into a table.
   * @param table - The name of the table.
   * @param record - The record to insert.
   * @returns The primary key of the inserted record.
   */
  async insert<T extends DefussRecord>(
    table: string,
    record: T,
  ): Promise<PrimaryKeyValue> {
    await this.createTable(table);

    // First prepare data for insertion, handling any binary fields
    const insertData: Record<string, any> = {};

    // Process all fields in the record
    for (const [key, value] of Object.entries(record)) {
      // Skip primary key as it will be auto-generated if not provided
      if (key === "pk") {
        if (value !== undefined) {
          insertData.pk = value;
        }
        continue;
      }

      // Store the value directly
      insertData[key] = value;
    }

    // Ensure all needed columns exist in schema
    await this.ensureColumnsForRecord(table, record);

    // Get the table reference and insert the data
    const tableDexie = this.tables.get(table)!;

    // Insert the record and return the primary key
    const id = await tableDexie.add(insertData);

    // Convert the index to a PrimaryKeyValue
    if (typeof id === "number") {
      return id;
    } else if (typeof id === "string") {
      return id;
    } else {
      // Handle IndexableType -> PrimaryKeyValue conversion
      return String(id);
    }
  }

  /**
   * Finds records in the table based on query.
   * @param table - The name of the table.
   * @param query - Query criteria.
   * @returns An array of matching records.
   */
  async find<T extends DefussRecord>(
    table: string,
    query: Partial<Record<string, RecordValue>>,
  ): Promise<T[]> {
    await this.createTable(table);
    const tableDexie = this.tables.get(table)!;

    // Ensure all needed columns exist
    await this.ensureColumnsForRecord(table, query as DefussRecord);

    // Simple case: no filters, return all records
    if (Object.keys(query).length === 0) {
      const results = await tableDexie.toArray();
      return results.map((result) => this.normalizeRecord(result) as T);
    }

    // Apply filters based on query - using index fields where possible
    let collection = tableDexie.toCollection();

    if ("pk" in query) {
      // Handle primary key query
      try {
        const record = await tableDexie.get(query.pk as IndexableType);
        return record ? [this.normalizeRecord(record) as T] : [];
      } catch (err) {
        // Fall back to regular query if direct get fails
        collection = collection.and((item) => item.pk === query.pk);
      }
    } else {
      // Handle all other queries
      for (const [key, value] of Object.entries(query)) {
        if (key.endsWith("_index")) {
          // Use indexed queries when possible
          collection = collection.and((item) => item[key] === value);
        } else {
          collection = collection.and((item) => item[key] === value);
        }
      }
    }

    // Execute the query and normalize the results
    const results = await collection.toArray();
    return results.map((result) => this.normalizeRecord(result) as T);
  }

  /**
   * Finds a single record in the table based on query.
   * @param table - The name of the table.
   * @param query - Query criteria.
   * @returns The first matching record or null.
   */
  async findOne<T extends DefussRecord>(
    table: string,
    query: Partial<Record<string, RecordValue>>,
  ): Promise<T | null> {
    // If query is by primary key, use get for efficiency
    if (Object.keys(query).length === 1 && "pk" in query) {
      await this.createTable(table);
      const tableDexie = this.tables.get(table)!;

      try {
        const result = await tableDexie.get(query.pk as IndexableType);
        return result ? (this.normalizeRecord(result) as T) : null;
      } catch (err) {
        // Fall back to regular find if get fails
      }
    }

    // Otherwise use the find method
    const results = await this.find<T>(table, query);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Updates records in the table based on query.
   * @param table - The name of the table.
   * @param query - Query criteria.
   * @param update - Fields to update.
   */
  async update<T extends DefussRecord>(
    table: string,
    query: Partial<Record<string, RecordValue>>,
    update: Partial<T>,
  ): Promise<void> {
    await this.createTable(table);
    const tableDexie = this.tables.get(table)!;

    // Ensure all needed columns exist
    await this.ensureColumnsForRecord(table, query as DefussRecord);
    await this.ensureColumnsForRecord(table, update as DefussRecord);

    // Prepare update data - pk can't be updated
    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(update)) {
      if (key === "pk") continue; // Skip primary key
      updateData[key] = value;
    }

    // Handle primary key query for efficiency
    if (Object.keys(query).length === 1 && "pk" in query) {
      await tableDexie.update(query.pk as IndexableType, updateData);
      return;
    }

    // For other queries, find matching records and update them
    const collection = tableDexie.toCollection().and((record) => {
      for (const [key, value] of Object.entries(query)) {
        if (record[key] !== value) return false;
      }
      return true;
    });

    const keys = await collection.primaryKeys();
    for (const key of keys) {
      await tableDexie.update(key, updateData);
    }
  }

  /**
   * Deletes records from the table based on query.
   * @param table - The name of the table.
   * @param query - Query criteria.
   */
  async delete(table: string, query: Partial<DefussRecord>): Promise<void> {
    await this.createTable(table);
    const tableDexie = this.tables.get(table)!;

    // Ensure all needed columns exist
    await this.ensureColumnsForRecord(table, query);

    // Handle primary key delete for efficiency
    if (Object.keys(query).length === 1 && "pk" in query) {
      await tableDexie.delete(query.pk as IndexableType);
      return;
    }

    // For other deletes, find matching records and delete them
    const collection = tableDexie.toCollection().and((record) => {
      for (const [key, value] of Object.entries(query)) {
        if (record[key] !== value) return false;
      }
      return true;
    });

    const keys = await collection.primaryKeys();
    await tableDexie.bulkDelete(keys);
  }

  /**
   * Upserts a record into the table based on query.
   * @param table - The name of the table.
   * @param record - The record to upsert.
   * @param query - Query criteria.
   * @returns The primary key of the upserted record.
   */
  async upsert<T extends DefussRecord>(
    table: string,
    record: T,
    query: Partial<Record<string, RecordValue>>,
  ): Promise<PrimaryKeyValue> {
    await this.createTable(table);

    // First, try to find an existing record
    const existingRecord = await this.findOne(table, query);

    if (existingRecord && existingRecord.pk !== undefined) {
      // Update existing record
      // Make a merged copy of the record with the query fields
      const mergedRecord = { ...record };

      // Update the record by its primary key
      await this.update<T>(
        table,
        { pk: existingRecord.pk },
        mergedRecord as Partial<T>,
      );
      return existingRecord.pk;
    } else {
      // Insert new record - include query fields
      const mergedRecord = { ...record } as DefussRecord;

      // Include query fields in the insert if not already in the record
      for (const [key, value] of Object.entries(query)) {
        if (!(key in mergedRecord)) {
          mergedRecord[key] = value;
        }
      }

      // Insert and return the new primary key
      return await this.insert<T>(table, mergedRecord as T);
    }
  }

  /**
   * Normalizes a database record to match DefussRecord structure.
   * @param record - The record from the database.
   * @returns A normalized DefussRecord.
   */
  private normalizeRecord(record: any): DefussRecord {
    const result: DefussRecord = {};

    // Handle each field
    for (const [key, value] of Object.entries(record)) {
      // Special handling for primary key
      if (key === "pk") {
        result.pk = value as PrimaryKeyValue;
        continue;
      }

      // Skip internal fields if any
      if (key.startsWith("_")) continue;

      // Copy the field
      result[key] = value as any;
    }

    return result;
  }
}
