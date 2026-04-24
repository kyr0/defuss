import type {
	DefussProvider,
	DefussSelector,
	PrimaryKeyValue,
	DefussRecord,
	DefussTableDefinition,
} from "./types.js";
import { createAggregation, type AggregationBuilder, type AggregationCreateOptions, type AggregationNamespacedRow } from "./aggregation/index.js";

export class DefussTable<T extends DefussRecord, O> {
	provider: DefussProvider<O>;
	definition: DefussTableDefinition<T>;

	/**
	 * Initializes the DefussTable with the specified table definition and provider.
	 * @param provider - The DefussProvider instance.
	 * @param definition - The table definition.
	 */
	constructor(provider: DefussProvider<O>, definition: DefussTableDefinition<T>) {
		this.provider = provider;
		this.definition = definition;
	}

	/**
	 * Creates the table if it doesn't exist.
	 */
	async init(): Promise<void> {
		await this.provider.ensureTable(this.definition);
	}

	/**
	 * Inserts an item into the table.
	 * @param value - The item to insert.
	 * @returns The primary key of the inserted row.
	 */
	async insert(value: T): Promise<PrimaryKeyValue> {
		return this.provider.insert<T>(this.definition, value);
	}

	/**
	 * Finds items based on the provided selector.
	 * @param selector - A selector over real value fields. All fields are optional.
	 * @returns An array of matching items.
	 */
	async find(selector: DefussSelector = {}): Promise<T[]> {
		return this.provider.find<T>(this.definition, selector);
	}

	/**
	 * Finds a single item based on the provided selector.
	 * @param selector - A selector over real value fields. All fields are optional.
	 * @returns The first matching item or null if not found.
	 */
	async findOne(selector: DefussSelector = {}): Promise<T | null> {
		return this.provider.findOne<T>(this.definition, selector);
	}

	/**
	 * Updates items based on the provided selector.
	 * @param selector - A selector over real value fields.
	 * @param dataToUpdate - A JSON object representing fields to update.
	 */
	async update(selector: DefussSelector, dataToUpdate: Partial<T>): Promise<void> {
		await this.provider.update<T>(this.definition, selector, dataToUpdate);
	}

	/**
	 * Deletes items based on the provided selector.
	 * @param selector - A selector over real value fields.
	 */
	async delete(selector: DefussSelector): Promise<void> {
		await this.provider.delete(this.definition, selector);
	}

	/**
	 * Upserts an item into the table based on the provided selector.
	 * @param selector - A non-empty selector resolving to `id` or a declared unique index.
	 * @param value - The item to insert or update.
	 * @returns The primary key of the upserted row.
	 */
	async upsert(selector: DefussSelector, value: T): Promise<PrimaryKeyValue> {
		return this.provider.upsert<T>(this.definition, selector, value);
	}

	aggregate<Alias extends string = "base">(
		options?: AggregationCreateOptions<Alias>,
	): AggregationBuilder<AggregationNamespacedRow<Alias, T>> {
		return createAggregation(this, options);
	}
}
