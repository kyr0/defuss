export type RecordValue =
  | string
  | bigint
  | number
  | boolean
  | null
  | ArrayBuffer
  | Blob;

export type PrimaryKeyValue = bigint | number | string;

export interface DefussRecord {
  pk?: PrimaryKeyValue;
  [key: string]: RecordValue | undefined;
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
   * Checks if the provider is currently connected to the database.
   * @returns True if connected, false otherwise.
   */
  isConnected(): boolean;

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
  insert<T extends DefussRecord>(
    table: string,
    value: T,
    indexData: Record<string, RecordValue>,
  ): Promise<PrimaryKeyValue>;

  /**
   * Finds items based on provided index data.
   * @param table - The name of the table.
   * @param indexData - A JSON object representing dynamic indices. All fields are optional.
   * @returns An array of matching items.
   */
  find<T extends DefussRecord>(
    table: string,
    indexData: Partial<Record<string, RecordValue>>,
  ): Promise<T[]>;

  /**
   * Finds a single item based on provided index data.
   * @param table - The name of the table.
   * @param indexData - A JSON object representing dynamic indices. All fields are optional.
   * @returns The first matching item or null if not found.
   */
  findOne<T extends DefussRecord>(
    table: string,
    indexData: Partial<Record<string, RecordValue>>,
  ): Promise<T | null>;

  /**
   * Updates items based on provided index data.
   * @param table - The name of the table.
   * @param indexData - A JSON object representing dynamic indices. All fields are optional.
   * @param dataToUpdate - A JSON object representing fields to update.
   */
  update<T extends DefussRecord>(
    table: string,
    indexData: Partial<Record<string, RecordValue>>,
    dataToUpdate: Partial<T>,
  ): Promise<void>;

  /**
   * Deletes items based on provided index data.
   * @param table - The name of the table.
   * @param indexData - A JSON object representing dynamic indices. All fields are optional.
   */
  delete(
    table: string,
    indexData: Partial<Record<string, RecordValue>>,
  ): Promise<void>;

  /**
   * Upserts an item into the specified table based on index data.
   * @param table - The name of the table.
   * @param value - The item to insert or update.
   * @param indexData - A JSON object representing dynamic indices used to identify the record.
   * @returns The primary key of the upserted row.
   */
  upsert<T extends DefussRecord>(
    table: string,
    value: T,
    indexData: Record<string, RecordValue>,
  ): Promise<PrimaryKeyValue>;
}
