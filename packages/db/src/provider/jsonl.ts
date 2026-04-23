import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
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
  buildStoredRow,
  hydrateStoredRow,
  matchesSelector,
  normalizeTableDefinition,
  type DefussStoredRow,
  type NormalizedDefussTableDefinition,
} from "../schema.js";

export interface JsonlProviderOptions {
  baseDir: string;
}

export class JsonlProvider implements DefussProvider<JsonlProviderOptions> {
  baseDir = "";
  connected = false;
  rowsByTable = new Map<string, Map<string, DefussStoredRow>>();
  definitions = new Map<string, NormalizedDefussTableDefinition<any>>();

  async connect(options: JsonlProviderOptions): Promise<void> {
    if (this.connected && this.baseDir === options.baseDir) {
      return;
    }

    this.baseDir = options.baseDir;
    await mkdir(this.baseDir, { recursive: true });
    await this.loadExistingTables();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private tableFile(tableName: string): string {
    return path.join(this.baseDir, `${tableName}.jsonl`);
  }

  private async loadExistingTables(): Promise<void> {
    this.rowsByTable.clear();
    const entries = await readdir(this.baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
        continue;
      }

      const tableName = entry.name.slice(0, -6);
      const filePath = this.tableFile(tableName);
      const content = await readFile(filePath, "utf8");
      const tableRows = new Map<string, DefussStoredRow>();

      for (const line of content.split("\n")) {
        if (!line.trim()) {
          continue;
        }

        const row = JSON.parse(line) as DefussStoredRow;
        tableRows.set(row.id, row);
      }

      this.rowsByTable.set(tableName, tableRows);
    }
  }

  private async rewriteTable(tableName: string): Promise<void> {
    const rows = [...(this.rowsByTable.get(tableName)?.values() ?? [])];
    const content = rows.map((row) => JSON.stringify(row)).join("\n");
    await writeFile(
      this.tableFile(tableName),
      content ? `${content}\n` : "",
      "utf8",
    );
  }

  private getTableRows(tableName: string): Map<string, DefussStoredRow> {
    let tableRows = this.rowsByTable.get(tableName);
    if (!tableRows) {
      tableRows = new Map<string, DefussStoredRow>();
      this.rowsByTable.set(tableName, tableRows);
    }
    return tableRows;
  }

  private async ensureUniqueConstraints<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    row: DefussStoredRow,
    ignoreId?: string,
  ): Promise<void> {
    const normalized = normalizeTableDefinition(definition);
    const existingRows = this.getTableRows(normalized.name);

    for (const candidate of existingRows.values()) {
      if (ignoreId && candidate.id === ignoreId) {
        continue;
      }

      if (candidate.id === row.id) {
        throw new Error(`defuss-db: duplicate id '${row.id}' in table '${normalized.name}'.`);
      }

      for (const index of normalized.indexes) {
        if (!index.unique || index.selector === "id") {
          continue;
        }

        const left = candidate.indexValues[index.storageKey];
        const right = row.indexValues[index.storageKey];

        if (left !== undefined && left === right) {
          throw new Error(
            `defuss-db: duplicate unique index '${index.selector}' in table '${normalized.name}'.`,
          );
        }
      }
    }
  }

  private rowsToRecords<T extends DefussRecord>(tableName: string): T[] {
    return [...this.getTableRows(tableName).values()].map((row) =>
      hydrateStoredRow<T>({ id: row.id, payload: row.payload }),
    );
  }

  async ensureTable<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
  ): Promise<void> {
    if (!this.connected) {
      throw new Error("defuss-db: JsonlProvider must be connected before use.");
    }

    const normalized = normalizeTableDefinition(definition);
    this.definitions.set(normalized.name, normalized);
    this.getTableRows(normalized.name);
    await writeFile(this.tableFile(normalized.name), "", { flag: "a" });
  }

  async insert<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    value: T,
  ): Promise<PrimaryKeyValue> {
    await this.ensureTable(definition);
    const normalized = normalizeTableDefinition(definition);
    const row = await buildStoredRow(definition, value);
    await this.ensureUniqueConstraints(definition, row);
    this.getTableRows(normalized.name).set(row.id, row);
    await appendFile(this.tableFile(normalized.name), `${JSON.stringify(row)}\n`, "utf8");
    return row.id;
  }

  async find<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    selector: DefussSelector = {},
  ): Promise<T[]> {
    await this.ensureTable(definition);
    const normalized = normalizeTableDefinition(definition);
    return this.rowsToRecords<T>(normalized.name).filter((record) =>
      matchesSelector(record, selector),
    );
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
    const normalized = normalizeTableDefinition(definition);
    const tableRows = this.getTableRows(normalized.name);
    const records = await this.find(definition, selector);

    for (const record of records) {
      if (update.id !== undefined && update.id !== record.id) {
        throw new Error("defuss-db: id cannot be updated.");
      }

      const nextRecord = {
        ...record,
        ...update,
        id: record.id,
      } as T;

      const row = await buildStoredRow(definition, nextRecord);
      await this.ensureUniqueConstraints(definition, row, row.id);
      tableRows.set(row.id, row);
    }

    await this.rewriteTable(normalized.name);
  }

  async delete<T extends DefussRecord>(
    definition: DefussTableDefinition<T>,
    selector: DefussSelector,
  ): Promise<void> {
    if (Object.keys(selector).length === 0) {
      throw new Error("defuss-db: delete requires a non-empty selector.");
    }

    await this.ensureTable(definition);
    const normalized = normalizeTableDefinition(definition);
    const tableRows = this.getTableRows(normalized.name);
    const records = await this.find(definition, selector);

    for (const record of records) {
      if (record.id) {
        tableRows.delete(String(record.id));
      }
    }

    await this.rewriteTable(normalized.name);
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
      const retried = await this.findOne(definition, selector);
      if (!retried?.id) {
        throw error;
      }

      await this.update(definition, { id: retried.id }, alignedValue);
      return retried.id;
    }
  }
}