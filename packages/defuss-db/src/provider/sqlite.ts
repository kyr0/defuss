import type { DefussProvider, DefussRow, LookupType } from '../types';
import { createClient, type Client, type Config as LibsqlConfig } from '@libsql/client';

/**
 * SQLiteProvider implements DefussProvider using libsql for SQLite databases.
 */
export class SQLiteProvider implements DefussProvider<LibsqlConfig> {
  private db!: Client;
  private serialize: (item: any) => string | Buffer;
  private deserialize: (data: string | Buffer) => any;

  constructor(
      serialize: (item: any) => string | Buffer = (item) => JSON.stringify(item),
      deserialize: (data: string | Buffer) => any = (data) => JSON.parse(data as string)
  ) {
      this.serialize = serialize;
      this.deserialize = deserialize;
  }

  /**
   * Connects to the SQLite database using libsql.
   * @param connectionString - The connection string (e.g., 'libsql://path/to/db.sqlite').
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
   * Adds dynamic columns as needed.
   * @param table - The name of the table.
   */
  async createTable(table: string): Promise<void> {
      await this.db.execute(`
          CREATE TABLE IF NOT EXISTS ${table} (
              primary_key INTEGER PRIMARY KEY AUTOINCREMENT,
              json TEXT,
              blob BLOB,
              type TEXT CHECK(type IN ('blob', 'json'))
          );
      `);
  }

  /**
   * Inserts a new record into the table with dynamic indices.
   * @param table - The name of the table.
   * @param value - The item to insert.
   * @param indexData - Dynamic indices for the item.
   * @returns The primary key of the inserted record.
   */
  async insert<T>(table: string, value: T, indexData: Record<string, string | number>): Promise<bigint> {
      await this.ensureTableExists(table);

      // Dynamically alter the table schema based on indexData
      const existingColumns = await this.getExistingColumns(table);
      const newColumns: { column: string; dataType: string }[] = [];

      for (const [key, val] of Object.entries(indexData)) {
          if (!existingColumns.includes(key)) {
              const dataType = this.getDataType(val);
              newColumns.push({ column: key, dataType });
              await this.addColumn(table, key, dataType);
              await this.addSingleIndex(table, key);
          }
      }

      // Serialize the value
      let type: LookupType = 'json';
      let json: string | undefined = undefined;
      let blob: Buffer | undefined = undefined;

      const serialized = this.serialize(value);
      if (typeof serialized === 'string') {
          type = 'json';
          json = serialized;
      } else {
          type = 'blob';
          blob = serialized;
      }

      // Construct the DefussRow
      const row: DefussRow = {
          type,
          json,
          blob,
          ...indexData
      };

      // Prepare SQL statement
      const columns = Object.keys(row)
          .filter((key) => row[key as keyof DefussRow] !== undefined)
          .join(', ');
      const placeholders = Object.keys(row).map(() => '?').join(', ');
      const values = Object.values(row).filter((value) => value !== undefined);

      const result = await this.db.execute(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
      return result.lastInsertRowid!;
  }

  /**
   * Finds records in the table based on indexData.
   * @param table - The name of the table.
   * @param indexData - Partial indices to filter records.
   * @returns An array of matching records.
   */
  async find<T>(table: string, indexData: Partial<Record<string, string | number>>): Promise<T[]> {
      await this.ensureTableExists(table);
      if (Object.keys(indexData).length === 0) {
          // Return all records
          const rows = await this.db.all<DefussRow[]>(`SELECT * FROM ${table}`);
          return rows.map(row => this.deserializeRow(row));
      }

      // Construct WHERE clause
      const conditions = Object.keys(indexData).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(indexData);
      const query = `SELECT * FROM ${table} WHERE ${conditions}`;
      const rows = await this.db.all<DefussRow[]>(query, ...values);
      return rows.map(row => this.deserializeRow(row));
  }

  /**
   * Finds a single record in the table based on indexData.
   * @param table - The name of the table.
   * @param indexData - Partial indices to filter records.
   * @returns The first matching record or null.
   */
  async findOne<T>(table: string, indexData: Partial<Record<string, string | number>>): Promise<T | null> {
      const results = await this.find<T>(table, indexData);
      return results.length > 0 ? results[0] : null;
  }

  /**
   * Updates records in the table based on indexData.
   * @param table - The name of the table.
   * @param indexData - Partial indices to filter records.
   * @param dataToUpdate - Fields to update.
   */
  async update<T>(table: string, indexData: Partial<Record<string, string | number>>, dataToUpdate: Partial<T>): Promise<void> {
      await this.ensureTableExists(table);
      if (Object.keys(indexData).length === 0) {
          throw new Error('At least one indexData field must be provided for update.');
      }

      // Dynamically alter the table schema based on dataToUpdate keys
      const existingColumns = await this.getExistingColumns(table);
      const newColumns: { column: string; dataType: string }[] = [];

      for (const [key, val] of Object.entries(dataToUpdate)) {
          if (!existingColumns.includes(key)) {
              const dataType = this.getDataType(val!);
              newColumns.push({ column: key, dataType });
              await this.addColumn(table, key, dataType);
              await this.addSingleIndex(table, key);
          }
      }

      // Serialize the updated data
      let type: LookupType = 'json';
      let json: string | undefined = undefined;
      let blob: Buffer | undefined = undefined;

      const serialized = this.serialize(dataToUpdate);
      if (typeof serialized === 'string') {
          type = 'json';
          json = serialized;
      } else {
          type = 'blob';
          blob = serialized;
      }

      // Construct the SET clause
      const setClause = Object.keys(dataToUpdate).map(key => `${key} = ?`).join(', ');
      const setValues = Object.values(dataToUpdate);

      // Construct the WHERE clause
      const whereClause = Object.keys(indexData).map(key => `${key} = ?`).join(' AND ');
      const whereValues = Object.values(indexData);

      const query = `UPDATE ${table} SET ${setClause}, type = ?, json = ?, blob = ? WHERE ${whereClause}`;
      await this.db.run(query, ...setValues, type, json, blob, ...whereValues);
  }

  /**
   * Deletes records from the table based on indexData.
   * @param table - The name of the table.
   * @param indexData - Partial indices to filter records.
   */
  async delete<T>(table: string, indexData: Partial<Record<string, string | number>>): Promise<void> {
      await this.ensureTableExists(table);
      if (Object.keys(indexData).length === 0) {
          throw new Error('At least one indexData field must be provided for deletion.');
      }

      // Construct WHERE clause
      const conditions = Object.keys(indexData).map(key => `${key} = ?`).join(' AND ');
      const values = Object.values(indexData);
      const query = `DELETE FROM ${table} WHERE ${conditions}`;
      await this.db.run(query, ...values);
  }

  /**
   * Upserts a record into the table based on indexData.
   * @param table - The name of the table.
   * @param value - The item to upsert.
   * @param indexData - Indices to identify the record.
   * @returns The primary key of the upserted record.
   */
  async upsert<T>(table: string, value: T, indexData: Record<string, string | number>): Promise<number> {
      const existingRecords = await this.find<T>(table, indexData);

      if (existingRecords.length > 0) {
          // Update existing records
          await this.update(table, indexData, value as Partial<T>);

          // Retrieve the primary key of the updated record
          const updatedRecord = await this.findOne<T>(table, indexData);
          if (updatedRecord && (updatedRecord as any).primary_key) {
              return (updatedRecord as any).primary_key;
          } else {
              throw new Error('Failed to retrieve updated record after upsert.');
          }
      } else {
          // Insert new record
          return this.insert<T>(table, value, indexData);
      }
  }

  /**
   * Ensures that the specified table exists.
   * @param table - The name of the table.
   */
  private async ensureTableExists(table: string): Promise<void> {
      const tables = await this.db.all<{ name: string }[]>(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, table);
      if (tables.length === 0) {
          await this.createTable(table);
      }
  }

  /**
   * Retrieves existing columns in the specified table.
   * @param table - The name of the table.
   * @returns An array of column names.
   */
  private async getExistingColumns(table: string): Promise<string[]> {
      const pragma = await this.db.all<{ name: string }[]>(`PRAGMA table_info(${table})`);
      return pragma.map(col => col.name);
  }

  /**
   * Adds a new column to the specified table.
   * @param table - The name of the table.
   * @param column - The name of the new column.
   * @param dataType - The SQLite data type of the new column.
   */
  private async addColumn(table: string, column: string, dataType: string): Promise<void> {
      const alterTableSQL = `ALTER TABLE ${table} ADD COLUMN ${column} ${dataType}`;
      await this.db.run(alterTableSQL);
  }

  /**
   * Adds a single index to the specified column in the table.
   * @param table - The name of the table.
   * @param column - The name of the column to index.
   */
  private async addSingleIndex(table: string, column: string): Promise<void> {
      const indexName = `idx_${table}_${column}`;
      const createIndexSQL = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${table} (${column})`;
      await this.db.run(createIndexSQL);
  }

  /**
   * Determines the SQLite data type based on the JavaScript value.
   * @param value - The value to determine the data type for.
   * @returns The corresponding SQLite data type.
   */
  private getDataType(value: string | number): string {
      if (typeof value === 'string') {
          return 'TEXT';
      } else if (typeof value === 'number') {
          return 'INTEGER';
      } else {
          throw new Error('Unsupported data type for index column.');
      }
  }

  /**
   * Deserializes a DefussRow into a JavaScript object.
   * @param row - The DefussRow to deserialize.
   * @returns The deserialized JavaScript object.
   */
  private deserializeRow(row: DefussRow): any {
      if (row.type === 'json' && row.json) {
          return this.deserialize(row.json);
      } else if (row.type === 'blob' && row.blob) {
          // Handle binary data if needed
          // For simplicity, converting ArrayBuffer to Buffer in Node.js
          return Buffer.from(row.blob);
      } else {
          throw new Error('Invalid row type or missing data.');
      }
  }
}
