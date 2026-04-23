export type RecordValue =
  | string
  | bigint
  | number
  | boolean
  | null
  | ArrayBuffer
  | Blob
  | Date;

export type DefussValue =
  | RecordValue
  | DefussValue[]
  | { [key: string]: DefussValue | undefined };

export type PrimaryKeyValue = bigint | number | string;

export interface DefussRecord {
  id?: PrimaryKeyValue;
  [key: string]: DefussValue | undefined;
}

export type DefussSelector = Partial<Record<string, RecordValue>>;

export interface DefussIndexDefinition<T extends DefussRecord = DefussRecord> {
  name: string;
  source?: string | ((value: T) => RecordValue | undefined);
  unique?: boolean;
}

export interface DefussTableDefinition<T extends DefussRecord = DefussRecord> {
  name: string;
  indexes?: Array<DefussIndexDefinition<T>>;
}

export function defineTable<T extends DefussRecord>(
  definition: DefussTableDefinition<T>,
): DefussTableDefinition<T> {
  return definition;
}

/**
 * Generic provider interface for Defuss microdb.
 */
export interface DefussProvider<O> {
  /**
   * Connects to the database using the provided connection string.
   * @param connectionString - The database connection string.
   */
  connect(options: O): Promise<void>;

  /**
   * Disconnects from the database.
   */
  disconnect(): Promise<void>;

  /**
   * Checks if the provider is currently connected to the database.
   * @returns True if connected, false otherwise.
   */
  isConnected(): boolean;

  /**
   * Ensures a table exists using the provided table definition.
   * @param definition - The normalized table definition.
   */
  ensureTable<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
  ): Promise<void>;

  /**
   * Inserts an item into the specified table.
   * @param definition - The table definition.
   * @param value - The item to insert.
   * @returns The primary key of the inserted row.
   */
  insert<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    value: T,
  ): Promise<PrimaryKeyValue>;

  /**
   * Finds items based on the provided selector.
   * @param definition - The table definition.
   * @param selector - A selector over real value fields. All fields are optional.
   * @returns An array of matching items.
   */
  find<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    selector?: DefussSelector,
  ): Promise<T[]>;

  /**
   * Finds a single item based on the provided selector.
   * @param definition - The table definition.
   * @param selector - A selector over real value fields. All fields are optional.
   * @returns The first matching item or null if not found.
   */
  findOne<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    selector?: DefussSelector,
  ): Promise<T | null>;

  /**
   * Updates items based on the provided selector.
   * @param definition - The table definition.
   * @param selector - A selector over real value fields. All fields are optional.
   * @param dataToUpdate - A JSON object representing fields to update.
   */
  update<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    selector: DefussSelector,
    dataToUpdate: Partial<T>,
  ): Promise<void>;

  /**
   * Deletes items based on the provided selector.
   * @param definition - The table definition.
   * @param selector - A selector over real value fields. All fields are optional.
   */
  delete<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    selector: DefussSelector,
  ): Promise<void>;

  /**
   * Upserts an item into the specified table based on the provided selector.
   * @param definition - The table definition.
   * @param selector - A non-empty selector resolving to `id` or a declared unique index.
   * @param value - The item to insert or update.
   * @returns The primary key of the upserted row.
   */
  upsert<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    selector: DefussSelector,
    value: T,
  ): Promise<PrimaryKeyValue>;
}
