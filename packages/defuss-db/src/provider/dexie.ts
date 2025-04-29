import Dexie, { type Table, type DexieOptions } from 'dexie';
import type { DefussProvider, DefussRow, LookupType } from '../types';
/**
 * DexieProvider implements DefussProvider for IndexedDB using Dexie.js.
 */
export class DexieProvider implements DefussProvider<DexieOptions> {
  protected db: Dexie;
  protected tables: Map<string, Table<DefussRow, number>>;
  protected databaseName: string;

  constructor(
    databaseName: string,
  ) {

    if (!databaseName) {
      databaseName = 'DefussDB';
    }
    this.databaseName = databaseName;
  }

  /**
   * Connects to IndexedDB. Dexie.js manages connections internally.
   * @param connectionString - Not used for DexieProvider.
   */
  async connect(options: DexieOptions = {}): Promise<void> {
      this.db = new Dexie(this.databaseName, options);
      this.tables = new Map();
  }

    /**
     * Disconnects from IndexedDB.
     */
    async disconnect(): Promise<void> {
        this.db.close();
    }

    /**
     * Creates a table if it doesn't exist.
     * @param table - The name of the table.
     */
    async createTable(table: string): Promise<void> {
        if (this.tables.has(table)) return;

        // Define the schema. All dynamic indices will be added as separate properties.
        // Dexie requires predefined indexes. For dynamic indices, Dexie does not support adding indexes at runtime.
        // As a workaround, we can define a primary key and manage indices manually.

        // Initialize the table with primary_key as primary key
        // Dexie requires schema versioning. We need to handle dynamic indices carefully.
        // For simplicity, we'll define the table with only the primary_key initially.
        // Dynamic indices will be managed via DefussRow's dynamic properties without actual IndexedDB indexes.

        // Check existing versions to avoid redefining
        const currentVersion = this.db.verno;
        const newVersion = currentVersion + 1;

        this.db.close();

        this.db.version(newVersion).stores({
            [table]: '++primary_key'
        });

        // https://stackoverflow.com/questions/44907820/dexie-how-to-add-to-array-in-nested-object
        const tableDexie = this.db.table<DefussRow, number>(table);
        this.tables.set(table, tableDexie);

        // Open the database to apply the version changes
        await this.db.open();
    }

    /**
     * Inserts a new record into the table with dynamic indices.
     * @param table - The name of the table.
     * @param value - The item to insert.
     * @param indexData - Dynamic indices for the item.
     * @returns The primary key of the inserted record.
     */
    async insert<T>(table: string, value: T, indexData: Record<string, string | number>): Promise<number> {
        await this.createTable(table);
        const tableDexie = this.db.table<DefussRow, number>(table);

        // Serialize the value
        let type: LookupType;
        let json: string | undefined = undefined;
        let blob: ArrayBuffer | undefined = undefined;

        if (value instanceof ArrayBuffer) {
            type = 'blob';
            blob = value
        } else {
            type = 'json';
            json = JSON.stringify(value);
        }

        // Construct the DefussRow
        const row: DefussRow = {
            type,
            json,
            blob,
            ...indexData
        };

        const primary_key = await tableDexie.add(row);
        return primary_key;
    }

    /**
     * Finds records in the table based on indexData.
     * @param table - The name of the table.
     * @param indexData - Partial indices to filter records.
     * @returns An array of matching records.
     */
    async find<T>(table: string, indexData: Partial<Record<string, string | number>>): Promise<T[]> {
        await this.createTable(table);
        const tableDexie = this.db.table<DefussRow, number>(table);

        let collection = tableDexie.toCollection();

        // Apply filters based on indexData
        for (const [key, value] of Object.entries(indexData)) {
            collection = collection.and(row => row[key] === value);
        }

        const rows = await collection.toArray();
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
        await this.createTable(table);
        const tableDexie = this.db.table<DefussRow, number>(table);

        // Find records matching indexData
        const records = await this.find<T>(table, indexData);
        for (const record of records) {
            const primary_key = (record as any).primary_key;
            if (primary_key !== undefined) {
                // Serialize the updated data
                let type: LookupType;
                let json: string | undefined;
                let blob: ArrayBuffer | undefined;

                if (typeof dataToUpdate === 'object' && dataToUpdate !== null) {
                    if (dataToUpdate instanceof ArrayBuffer) {
                        type = 'blob';
                        blob = dataToUpdate;
                    } else {
                        type = 'json';
                        json = JSON.stringify(dataToUpdate);
                    }
                } else {
                    throw new Error('Unsupported data type for update.');
                }

                const updatedRow: DefussRow = {
                    type,
                    json,
                    blob,
                    ...dataToUpdate
                };

                await tableDexie.update(primary_key, updatedRow);
            }
        }
    }

    /**
     * Deletes records from the table based on indexData.
     * @param table - The name of the table.
     * @param indexData - Partial indices to filter records.
     */
    async delete<T>(table: string, indexData: Partial<Record<string, string | number>>): Promise<void> {
        await this.createTable(table);
        const tableDexie = this.db.table<DefussRow, number>(table);

        // Find records matching indexData
        const records = await this.find<T>(table, indexData);
        for (const record of records) {
            const primary_key = (record as any).primary_key;
            if (primary_key !== undefined) {
                await tableDexie.delete(primary_key);
            }
        }
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
     * Deserializes a DefussRow into a JavaScript object.
     * @param row - The DefussRow to deserialize.
     * @returns The deserialized JavaScript object.
     */
    private deserializeRow(row: DefussRow): any {
        if (row.type === 'json' && row.json) {
            return JSON.parse(row.json);
        } else if (row.type === 'blob' && row.blob) {
            // Handle binary data if needed
            // For simplicity, converting ArrayBuffer to Buffer in Node.js
            return Buffer.from(row.blob);
        } else {
            throw new Error('Invalid row type or missing data.');
        }
    }
}
