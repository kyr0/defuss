import type {
  DefussProvider,
  DefussRecord,
  PrimaryKeyValue,
  RecordValue,
} from "../types.js";
import {
  createClient,
  type Client,
  type Config as LibsqlConfig,
  type InValue,
} from "@libsql/client";

export type LibsqlProviderOptions = LibsqlConfig;

/**
 * LibsqlProvider implements DefussProvider using libsql for SQLite databases.
 */
export class LibsqlProvider implements DefussProvider<LibsqlConfig> {
  db!: Client;

  /**
   * Connects to the SQLite database using libsql.
   * @param config - The libsql connection configuration.
   */
  async connect(config: LibsqlConfig): Promise<void> {
    this.db = createClient(config);
  }

  /**
   * Disconnects from the SQLite database.
   */
  async disconnect(): Promise<void> {
    this.db.close();
  }

  /**
   * Creates a table if it doesn't exist.
   * Sets up the primary key and any initial structure needed.
   * @param table - The name of the table.
   */
  async createTable(table: string): Promise<void> {
    await this.db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS ${table} (
            pk INTEGER PRIMARY KEY AUTOINCREMENT
        );
      `,
    });
  }

  /**
   * Ensures all necessary columns exist in the table
   * @param table - The name of the table
   * @param record - DefussRecord containing fields to ensure
   */
  private async ensureColumnsExist(
    table: string,
    record: Partial<DefussRecord>,
  ): Promise<void> {
    const existingColumns = await this.getExistingColumns(table);

    for (const [key, value] of Object.entries(record)) {
      if (key === "pk") continue; // Skip pk field, it maps to pk

      if (!existingColumns.includes(key) && value !== undefined) {
        // Determine the column type based on the value
        const dataType = this.getSqliteType(value);

        // Add the column to the table
        await this.db.execute({
          sql: `ALTER TABLE ${table} ADD COLUMN ${key} ${dataType}`,
        });

        // If this is an index field (ends with _index), create an index for it
        if (key.endsWith("_index")) {
          const indexName = `idx_${table}_${key}`;
          await this.db.execute({
            sql: `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${key})`,
          });
        }
      }
    }
  }

  /**
   * Gets the SQLite data type for a JavaScript value
   * @param value The JavaScript value to map to SQLite type
   * @returns The SQLite type string
   */
  private getSqliteType(value: any): string {
    if (value === null || value === undefined) {
      return "TEXT"; // Default to TEXT for null/undefined
    }

    if (typeof value === "string") {
      return "TEXT";
    } else if (typeof value === "number") {
      return Number.isInteger(value) ? "INTEGER" : "REAL";
    } else if (typeof value === "boolean") {
      return "INTEGER"; // SQLite has no native boolean, use INTEGER (0/1)
    } else if (value instanceof ArrayBuffer || value instanceof Blob) {
      return "BLOB";
    } else {
      return "TEXT"; // Default for complex objects (will be JSON serialized)
    }
  }

  /**
   * Retrieves existing columns in the specified table.
   * @param table - The name of the table.
   * @returns An array of column names.
   */
  private async getExistingColumns(table: string): Promise<string[]> {
    const result = await this.db.execute({
      sql: `PRAGMA table_info(${table})`,
    });
    return result.rows.map((col: any) => col.name as string);
  }

  /**
   * Converts a DefussRecord to SQLite values
   * @param record The DefussRecord to convert
   * @returns Object with column names and values for SQLite
   */
  private toSqliteValues(record: DefussRecord): Record<string, InValue> {
    const result: Record<string, InValue> = {};

    // Process all fields
    for (const [key, value] of Object.entries(record)) {
      // Skip primary key (handled separately)
      if (key === "pk") continue;

      // For indexed fields, make sure we set both the original and indexed versions
      if (key.endsWith("_index")) {
        result[key] = this.convertValueForSqlite(value);
      } else {
        // For regular fields, just set the value
        result[key] = this.convertValueForSqlite(value);
      }
    }

    return result;
  }

  /**
   * Convert JavaScript value to SQLite-compatible value
   */
  private convertValueForSqlite(value: any): InValue {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string" || typeof value === "number") {
      return value;
    } else if (typeof value === "boolean") {
      return value ? 1 : 0;
    } else if (value instanceof ArrayBuffer) {
      return Buffer.from(value);
    } else if (value instanceof Blob) {
      // For Blob, we'd need to convert it to Buffer, but this requires async operations
      // In practice, you might need to handle this case differently
      return null;
    } else {
      // Try to JSON stringify complex objects
      try {
        return JSON.stringify(value);
      } catch (e) {
        return null;
      }
    }
  }

  /**
   * Convert SQLite row to DefussRecord
   */
  private fromSqliteRow(row: any): DefussRecord {
    const result: DefussRecord = {};

    // Copy all fields directly
    for (const [key, value] of Object.entries(row)) {
      result[key] = value as any;
    }

    return result;
  }

  /**
   * Inserts a record into the table.
   * @param table - The name of the table.
   * @param record - The record to insert.
   * @returns The primary key of the inserted record.
   */
  async insert<T extends DefussRecord>(
    table: string,
    record: T,
  ): Promise<PrimaryKeyValue> {
    await this.ensureTableExists(table);
    await this.ensureColumnsExist(table, record);

    // Prepare the values to insert
    const values = this.toSqliteValues(record);

    // Handle potential provided primary key
    if (record.pk !== undefined) {
      values.pk = record.pk;
    }

    // Build the SQL insert statement
    const columns = Object.keys(values).join(", ");
    const placeholders = Object.keys(values)
      .map(() => "?")
      .join(", ");
    const args = Object.values(values) as InValue[];

    // Execute the insert
    const result = await this.db.execute({
      sql: `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
      args,
    });

    return result.lastInsertRowid!;
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
    await this.ensureTableExists(table);

    // If there are search parameters, make sure their columns exist
    if (Object.keys(query).length > 0) {
      await this.ensureColumnsExist(table, query as DefussRecord);
    }

    // Build the query
    let sql = `SELECT * FROM ${table}`;
    const args: InValue[] = [];

    if (Object.keys(query).length > 0) {
      // Build WHERE clause
      const conditions = Object.keys(query)
        .map((key) => `${key} = ?`)
        .join(" AND ");

      sql += ` WHERE ${conditions}`;
      args.push(
        ...Object.values(query).map((val) => this.convertValueForSqlite(val)),
      );
    }

    // Execute the query
    const result = await this.db.execute({ sql, args });

    // Convert rows to DefussRecords
    return result.rows.map((row) => this.fromSqliteRow(row) as T);
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
    await this.ensureTableExists(table);
    await this.ensureColumnsExist(table, query as DefussRecord);
    await this.ensureColumnsExist(table, update as DefussRecord);

    // Disallow empty queries for safety
    if (Object.keys(query).length === 0) {
      throw new Error("At least one query field must be provided for update.");
    }

    // Convert update values
    const updateValues = this.toSqliteValues(update);

    // Build SET clause
    const setClauses = Object.keys(updateValues)
      .map((key) => `${key} = ?`)
      .join(", ");

    const setArgs = Object.values(updateValues);

    // Build WHERE clause
    const whereConditions: string[] = [];
    const whereArgs: InValue[] = [];

    for (const [key, value] of Object.entries(query)) {
      whereConditions.push(`${key} = ?`);
      whereArgs.push(this.convertValueForSqlite(value));
    }

    const whereClause = whereConditions.join(" AND ");

    // Execute the update
    await this.db.execute({
      sql: `UPDATE ${table} SET ${setClauses} WHERE ${whereClause}`,
      args: [...setArgs, ...whereArgs],
    });
  }

  /**
   * Deletes records from the table based on query.
   * @param table - The name of the table.
   * @param query - Query criteria.
   */
  async delete(table: string, query: Partial<DefussRecord>): Promise<void> {
    await this.ensureTableExists(table);

    // Disallow empty queries for safety
    if (Object.keys(query).length === 0) {
      throw new Error(
        "At least one query field must be provided for deletion.",
      );
    }

    // Ensure columns exist
    await this.ensureColumnsExist(table, query);

    // Build WHERE clause
    const whereConditions: string[] = [];
    const whereArgs: InValue[] = [];

    for (const [key, value] of Object.entries(query)) {
      whereConditions.push(`${key} = ?`);
      whereArgs.push(this.convertValueForSqlite(value));
    }

    const whereClause = whereConditions.join(" AND ");

    // Execute the delete
    await this.db.execute({
      sql: `DELETE FROM ${table} WHERE ${whereClause}`,
      args: whereArgs,
    });
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
    // Check if a record matching the query exists
    const existingRecord = await this.findOne(table, query);

    if (existingRecord) {
      // Update the existing record
      if (existingRecord.pk !== undefined) {
        // Update by primary key for efficiency
        await this.update(table, { pk: existingRecord.pk }, record);
        return existingRecord.pk;
      } else {
        // Update by query if no pk is available
        await this.update(table, query, record);

        // Try to find the updated record's primary key
        const updatedRecord = await this.findOne(table, query);
        return updatedRecord?.pk || 0;
      }
    } else {
      // Insert a new record with the query fields
      const insertRecord = { ...record } as DefussRecord;

      // Include query fields in the insert if not already in the record
      for (const [key, value] of Object.entries(query)) {
        if (!(key in insertRecord)) {
          insertRecord[key] = value;
        }
      }

      // Insert and return the new primary key
      return await this.insert<T>(table, insertRecord as T);
    }
  }

  /**
   * Ensures that the specified table exists.
   * @param table - The name of the table.
   */
  private async ensureTableExists(table: string): Promise<void> {
    const result = await this.db.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      args: [table],
    });

    if (result.rows.length === 0) {
      await this.createTable(table);
    }
  }
}
