import {
	createClient,
	type Client,
	type Config as LibsqlConfig,
	type InValue,
} from "@libsql/client";
import type {
	DefussProvider,
	DefussRecord,
	DefussSelector,
	DefussTableDefinition,
	PrimaryKeyValue,
} from "../types.js";
import {
	alignValueWithSelector,
	assertUpsertSelector,
	buildIndexName,
	buildStoredRow,
	hydrateStoredRow,
	matchesSelector,
	normalizeTableDefinition,
	planSelector,
	quoteSqlIdentifier,
	type DefussStoredRow,
	type NormalizedDefussTableDefinition,
} from "../schema.js";

export type LibsqlProviderOptions = LibsqlConfig;

const PAYLOAD_COLUMN = "__payload";

export class LibsqlProvider implements DefussProvider<LibsqlConfig> {
	db!: Client;
	definitions: Map<string, NormalizedDefussTableDefinition<any>> = new Map();

	async connect(config: LibsqlConfig): Promise<void> {
		if (this.db && this.isConnected()) {
			return;
		}

		this.db = createClient(config);
	}

	async disconnect(): Promise<void> {
		this.db.close();
	}

	isConnected(): boolean {
		return this.db?.closed !== true;
	}

	private async getExistingColumns(tableName: string): Promise<string[]> {
		const result = await this.db.execute({
			sql: `PRAGMA table_info(${quoteSqlIdentifier(tableName)})`,
		});

		return result.rows.map((row) => String((row as Record<string, unknown>).name));
	}

	private async upsertRow<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		row: DefussStoredRow,
	): Promise<void> {
		const normalized = normalizeTableDefinition(definition);
		const columns = ["id", PAYLOAD_COLUMN, ...normalized.indexes
			.filter((index) => index.selector !== "id")
			.map((index) => index.storageKey)];
		const quotedColumns = columns.map((column) => quoteSqlIdentifier(column));
		const placeholders = columns.map(() => "?").join(", ");
		const assignments = columns
			.filter((column) => column !== "id")
			.map((column) => `${quoteSqlIdentifier(column)} = excluded.${quoteSqlIdentifier(column)}`)
			.join(", ");
		const args: InValue[] = columns.map((column) => {
			if (column === "id") {
				return row.id;
			}

			if (column === PAYLOAD_COLUMN) {
				return row.payload;
			}

			return row.indexValues[column] ?? null;
		});

		await this.db.execute({
			sql: `INSERT INTO ${quoteSqlIdentifier(definition.name)} (${quotedColumns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(${quoteSqlIdentifier("id")}) DO UPDATE SET ${assignments}`,
			args,
		});
	}

	private async queryRows<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
	): Promise<T[]> {
		const plan = planSelector(definition, selector);
		let sql = `SELECT ${quoteSqlIdentifier("id")}, ${quoteSqlIdentifier(PAYLOAD_COLUMN)} FROM ${quoteSqlIdentifier(definition.name)}`;
		const args: InValue[] = [];

		if (plan.id) {
			sql += ` WHERE ${quoteSqlIdentifier("id")} = ?`;
			args.push(plan.id);
		} else if (plan.indexedClauses.length > 0) {
			const [clause] = plan.indexedClauses;
			sql += ` WHERE ${quoteSqlIdentifier(clause.index!.storageKey)} = ?`;
			args.push(clause.serializedValue ?? null);
		}

		const result = await this.db.execute({ sql, args });
		return result.rows
			.map((row) =>
				hydrateStoredRow<T>({
					id: String((row as Record<string, unknown>).id),
					payload: String((row as Record<string, unknown>)[PAYLOAD_COLUMN]),
				}),
			)
			.filter((row) => matchesSelector(row, selector, definition));
	}

	async ensureTable<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
	): Promise<void> {
		const normalized = normalizeTableDefinition(definition);

		if (!this.definitions.has(normalized.name)) {
			this.definitions.set(normalized.name, normalized);
		}

		await this.db.execute({
			sql: `CREATE TABLE IF NOT EXISTS ${quoteSqlIdentifier(normalized.name)} (${quoteSqlIdentifier("id")} TEXT PRIMARY KEY NOT NULL, ${quoteSqlIdentifier(PAYLOAD_COLUMN)} TEXT NOT NULL)`,
		});

		const existingColumns = await this.getExistingColumns(normalized.name);

		for (const index of normalized.indexes) {
			if (index.selector === "id") {
				continue;
			}

			if (!existingColumns.includes(index.storageKey)) {
				await this.db.execute({
					sql: `ALTER TABLE ${quoteSqlIdentifier(normalized.name)} ADD COLUMN ${quoteSqlIdentifier(index.storageKey)} TEXT`,
				});
			}

			await this.db.execute({
				sql: `CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${quoteSqlIdentifier(buildIndexName(normalized.name, index.storageKey))} ON ${quoteSqlIdentifier(normalized.name)} (${quoteSqlIdentifier(index.storageKey)})`,
			});
		}
	}

	async insert<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		value: T,
	): Promise<PrimaryKeyValue> {
		await this.ensureTable(definition);
		const row = await buildStoredRow(definition, value);
		await this.upsertRow(definition, row);
		return row.id;
	}

	async find<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector = {},
	): Promise<T[]> {
		await this.ensureTable(definition);
		return this.queryRows(definition, selector);
	}

	async findOne<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector = {},
	): Promise<T | null> {
		const rows = await this.find(definition, selector);
		return rows[0] ?? null;
	}

	async update<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
		update: Partial<T>,
	): Promise<void> {
		if (Object.keys(selector).length === 0) {
			throw new Error("defuss-db: update requires a non-empty selector.");
		}

		await this.ensureTable(definition);
		const rows = await this.queryRows(definition, selector);

		for (const record of rows) {
			if (update.id !== undefined && update.id !== record.id) {
				throw new Error("defuss-db: id cannot be updated.");
			}

			const nextRecord = {
				...record,
				...update,
				id: record.id,
			} as T;

			const row = await buildStoredRow(definition, nextRecord);
			await this.upsertRow(definition, row);
		}
	}

	async delete<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
	): Promise<void> {
		if (Object.keys(selector).length === 0) {
			throw new Error("defuss-db: delete requires a non-empty selector.");
		}

		await this.ensureTable(definition);
		const rows = await this.queryRows(definition, selector);
		if (rows.length === 0) {
			return;
		}

		const placeholders = rows.map(() => "?").join(", ");
		await this.db.execute({
			sql: `DELETE FROM ${quoteSqlIdentifier(definition.name)} WHERE ${quoteSqlIdentifier("id")} IN (${placeholders})`,
			args: rows.map((row) => String(row.id)),
		});
	}

	async upsert<T extends DefussRecord>(
		definition: DefussTableDefinition<T>,
		selector: DefussSelector,
		value: T,
	): Promise<PrimaryKeyValue> {
		assertUpsertSelector(definition, selector);
		await this.ensureTable(definition);

		const alignedValue = alignValueWithSelector(value, selector);
		const existing = await this.findOne(definition, selector);

		if (existing?.id) {
			await this.update(definition, { id: existing.id }, alignedValue);
			return existing.id;
		}

		try {
			return await this.insert(definition, alignedValue);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!message.includes("UNIQUE") && !message.includes("constraint")) {
				throw error;
			}

			const retried = await this.findOne(definition, selector);
			if (!retried?.id) {
				throw error;
			}

			await this.update(definition, { id: retried.id }, alignedValue);
			return retried.id;
		}
	}
}
