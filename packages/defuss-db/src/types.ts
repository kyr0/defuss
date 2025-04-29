export type LookupType = 'blob' | 'json';

/**
 * Represents the generic Defuss row stored in the database.
 */
export interface DefussRow {
    primary_key?: number; // Auto-incremented primary key
    json?: string;
    blob?: ArrayBuffer|Buffer; // Using ArrayBuffer for binary data in browser environments (Dexie), Buffer (UInt8Array) in Node.js
    type: LookupType;
    // Dynamic index columns will be added as needed
    [key: string]: any; // Allow dynamic properties
}

/**
 * Generic provider interface for Defuss microdb.
 */
export interface DefussProvider<O> {
    /**
     * Connects to the database using the provided connection string.
     * @param connectionString - The database connection string.
     */
    connect(options: O): void;

    /**
     * Disconnects from the database.
     */
    disconnect(): void;

    /**
     * Creates a table if it doesn't exist.
     * @param table - The name of the table.
     */
    createTable(table: string): Promise<void>;

    /**
     * Inserts an item into the specified table with dynamic indices.
     * @param table - The name of the table.
     * @param value - The item to insert.
     * @param indexData - A JSON object representing dynamic indices.
     * @returns The primary key of the inserted row.
     */
    insert<T>(table: string, value: T, indexData: Record<string, string | number>): Promise<bigint|number>;

    /**
     * Finds items based on provided index data.
     * @param table - The name of the table.
     * @param indexData - A JSON object representing dynamic indices. All fields are optional.
     * @returns An array of matching items.
     */
    find<T>(table: string, indexData: Partial<Record<string, string | number>>): Promise<T[]>;

    /**
     * Finds a single item based on provided index data.
     * @param table - The name of the table.
     * @param indexData - A JSON object representing dynamic indices. All fields are optional.
     * @returns The first matching item or null if not found.
     */
    findOne<T>(table: string, indexData: Partial<Record<string, string | number>>): Promise<T | null>;

    /**
     * Updates items based on provided index data.
     * @param table - The name of the table.
     * @param indexData - A JSON object representing dynamic indices. All fields are optional.
     * @param dataToUpdate - A JSON object representing fields to update.
     */
    update<T>(table: string, indexData: Partial<Record<string, string | number>>, dataToUpdate: Partial<T>): Promise<void>;

    /**
     * Deletes items based on provided index data.
     * @param table - The name of the table.
     * @param indexData - A JSON object representing dynamic indices. All fields are optional.
     */
    delete(table: string, indexData: Partial<Record<string, string | number>>): Promise<void>;

    /**
     * Upserts an item into the specified table based on index data.
     * @param table - The name of the table.
     * @param value - The item to insert or update.
     * @param indexData - A JSON object representing dynamic indices used to identify the record.
     * @returns The primary key of the upserted row.
     */
    upsert<T>(table: string, value: T, indexData: Record<string, string | number>): Promise<number>;
}