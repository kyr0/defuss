import type {
  DefussProvider,
  PrimaryKeyValue,
  RecordValue,
  DefussRecord,
} from "./types.js";

export class DefussTable<T extends DefussRecord, O> {
  provider: DefussProvider<O>;
  tableName: string;

  /**
   * Initializes the DefussTable with the specified table name and provider.
   * @param provider - The DefussProvider instance.
   * @param tableName - The name of the table.
   */
  constructor(provider: DefussProvider<O>, tableName: string) {
    this.provider = provider;
    this.tableName = tableName;
  }

  /**
   * Creates the table if it doesn't exist.
   */
  async init(): Promise<void> {
    await this.provider.createTable(this.tableName);
  }

  /**
   * Inserts an item into the table with dynamic indices.
   * @param value - The item to insert.
   * @param indexData - A JSON object representing dynamic indices.
   * @returns The primary key of the inserted row.
   */
  async insert(
    value: T,
    indexData: Record<string, RecordValue>,
  ): Promise<PrimaryKeyValue> {
    return this.provider.insert<T>(this.tableName, value, indexData);
  }

  /**
   * Finds items based on provided index data.
   * @param indexData - A JSON object representing dynamic indices. All fields are optional.
   * @returns An array of matching items.
   */
  async find(
    indexData: Partial<Record<string, RecordValue>> = {},
  ): Promise<T[]> {
    return this.provider.find<T>(this.tableName, indexData);
  }

  /**
   * Finds a single item based on provided index data.
   * @param indexData - A JSON object representing dynamic indices. All fields are optional.
   * @returns The first matching item or null if not found.
   */
  async findOne(
    indexData: Partial<Record<string, RecordValue>> = {},
  ): Promise<T | null> {
    return this.provider.findOne<T>(this.tableName, indexData);
  }

  /**
   * Updates items based on provided index data.
   * @param indexData - A JSON object representing dynamic indices. All fields are optional.
   * @param dataToUpdate - A JSON object representing fields to update.
   */
  async update(
    indexData: Partial<Record<string, RecordValue>>,
    dataToUpdate: Partial<T>,
  ): Promise<void> {
    await this.provider.update<T>(this.tableName, indexData, dataToUpdate);
  }

  /**
   * Deletes items based on provided index data.
   * @param indexData - A JSON object representing dynamic indices. All fields are optional.
   */
  async delete(indexData: Partial<Record<string, RecordValue>>): Promise<void> {
    await this.provider.delete(this.tableName, indexData);
  }

  /**
   * Upserts an item into the table based on index data.
   * @param value - The item to insert or update.
   * @param indexData - A JSON object representing dynamic indices used to identify the record.
   * @returns The primary key of the upserted row.
   */
  async upsert(
    value: T,
    indexData: Record<string, RecordValue>,
  ): Promise<PrimaryKeyValue> {
    return this.provider.upsert<T>(this.tableName, value, indexData);
  }
}
