import type { DefussSelector, DefussRecord } from "../types.js";
import type { DefussTable } from "../table.js";

type AnyRecord = Record<string, unknown>;

type MergeShape<TLeft extends AnyRecord, TRight extends AnyRecord> = Omit<TLeft, keyof TRight> &
	TRight;

type ShallowNullable<TValue> = {
	[K in keyof TValue]: TValue[K] | null;
};

export type AggregationJoinType = "left" | "right" | "inner";

export type AggregationNamespacedRow<Alias extends string, TRow extends AnyRecord> = {
	[K in Alias]: TRow;
};

export type AggregationJoinResult<
	TRow extends AnyRecord,
	Alias extends string,
	TJoined extends AnyRecord,
	TType extends AggregationJoinType,
> = TType extends "inner"
	? MergeShape<TRow, Record<Alias, TJoined>>
	: TType extends "left"
		? MergeShape<TRow, Record<Alias, TJoined | null>>
		: MergeShape<ShallowNullable<TRow>, Record<Alias, TJoined>>;

export interface AggregationCreateOptions<Alias extends string = string> {
	as?: Alias;
	where?: DefussSelector;
}

export type AggregationRowsLoader<TRow extends AnyRecord> =
	| TRow[]
	| Promise<TRow[]>
	| (() => TRow[] | Promise<TRow[]>);

export interface AggregationTableSource<
	TRow extends DefussRecord = DefussRecord,
	Alias extends string = string,
> {
	table: DefussTable<TRow, any>;
	as: Alias;
	where?: DefussSelector;
}

export interface AggregationRowsSource<
	TRow extends AnyRecord = AnyRecord,
	Alias extends string = string,
> {
	rows: AggregationRowsLoader<TRow>;
	as: Alias;
}

export type AggregationSource<
	TRow extends AnyRecord = AnyRecord,
	Alias extends string = string,
> = AggregationTableSource<TRow & DefussRecord, Alias> | AggregationRowsSource<TRow, Alias>;

export interface AggregationJoinSpec<TType extends AggregationJoinType = AggregationJoinType> {
	type?: TType;
	left: string;
	right: string;
}

export interface AggregationRowContext<TRow extends AnyRecord> {
	index: number;
	rows: readonly TRow[];
	sources: Readonly<Record<string, readonly AnyRecord[]>>;
	aggregation: AggregationBuilder<any>;
}

export type AggregationValueResolver<TRow extends AnyRecord, TValue> =
	| string
	| ((row: Readonly<TRow>, context: AggregationRowContext<TRow>) => TValue | Promise<TValue>);

export type AggregationProjectionMap<TRow extends AnyRecord> = Record<
	string,
	AggregationValueResolver<TRow, unknown>
>;

export type AggregationRowMapper<TRow extends AnyRecord, TNext extends AnyRecord> = (
	row: Readonly<TRow>,
	context: AggregationRowContext<TRow>,
) => TNext | Promise<TNext>;

type ProjectionResult<TProjection extends AggregationProjectionMap<any>> = {
	[K in keyof TProjection]: TProjection[K] extends (...args: any[]) => infer TResult
		? Awaited<TResult>
		: unknown;
};

type AggregationJoinDefinition = {
	source: AggregationSource<AnyRecord, string>;
	spec: Required<AggregationJoinSpec>;
};

type AggregationOperation =
	| {
		kind: "project";
		mapping: AggregationProjectionMap<any>;
	  }
	| {
		kind: "alias";
		mapping: AggregationProjectionMap<any>;
	  }
	| {
		kind: "compute";
		field: string;
		resolver: AggregationValueResolver<any, unknown>;
	  }
	| {
		kind: "computeMany";
		mapping: AggregationProjectionMap<any>;
	  }
	| {
		kind: "mapRows";
		mapper: AggregationRowMapper<any, AnyRecord>;
	  };

export class AggregationBuilder<TRow extends AnyRecord> {
	private readonly baseSource: AggregationSource<AnyRecord, string>;
	private readonly joins: AggregationJoinDefinition[];
	private readonly operations: AggregationOperation[];

	constructor(
		baseSource: AggregationSource<AnyRecord, string>,
		joins: AggregationJoinDefinition[] = [],
		operations: AggregationOperation[] = [],
	) {
		this.baseSource = baseSource;
		this.joins = joins;
		this.operations = operations;
	}

	join<
		TJoined extends AnyRecord,
		Alias extends string,
		TType extends AggregationJoinType = "left",
	>(
		source: AggregationSource<TJoined, Alias>,
		spec: AggregationJoinSpec<TType>,
	): AggregationBuilder<AggregationJoinResult<TRow, Alias, TJoined, TType>> {
		assertUniqueAlias(this.getSourceAliases(), source.as);

		return new AggregationBuilder<AggregationJoinResult<TRow, Alias, TJoined, TType>>(
			this.baseSource,
			[
				...this.joins,
				{
					source: source as AggregationSource<AnyRecord, string>,
					spec: {
						type: spec.type ?? "left",
						left: spec.left,
						right: spec.right,
					},
				},
			],
			this.operations,
		);
	}

	project<TProjection extends AggregationProjectionMap<TRow>>(
		mapping: TProjection,
	): AggregationBuilder<ProjectionResult<TProjection>> {
		return new AggregationBuilder<ProjectionResult<TProjection>>(
			this.baseSource,
			this.joins,
			[
				...this.operations,
				{
					kind: "project",
					mapping: mapping as AggregationProjectionMap<any>,
				},
			],
		);
	}

	alias<TProjection extends AggregationProjectionMap<TRow>>(
		mapping: TProjection,
	): AggregationBuilder<MergeShape<TRow, ProjectionResult<TProjection>>> {
		return new AggregationBuilder<MergeShape<TRow, ProjectionResult<TProjection>>>(
			this.baseSource,
			this.joins,
			[
				...this.operations,
				{
					kind: "alias",
					mapping: mapping as AggregationProjectionMap<any>,
				},
			],
		);
	}

	compute<TKey extends string, TValue>(
		field: TKey,
		resolver: AggregationValueResolver<TRow, TValue>,
	): AggregationBuilder<MergeShape<TRow, Record<TKey, TValue>>> {
		return new AggregationBuilder<MergeShape<TRow, Record<TKey, TValue>>>(
			this.baseSource,
			this.joins,
			[
				...this.operations,
				{
					kind: "compute",
					field,
					resolver: resolver as AggregationValueResolver<any, unknown>,
				},
			],
		);
	}

	computeMany<TProjection extends AggregationProjectionMap<TRow>>(
		mapping: TProjection,
	): AggregationBuilder<MergeShape<TRow, ProjectionResult<TProjection>>> {
		return new AggregationBuilder<MergeShape<TRow, ProjectionResult<TProjection>>>(
			this.baseSource,
			this.joins,
			[
				...this.operations,
				{
					kind: "computeMany",
					mapping: mapping as AggregationProjectionMap<any>,
				},
			],
		);
	}

	mapRows<TNext extends AnyRecord>(
		mapper: AggregationRowMapper<TRow, TNext>,
	): AggregationBuilder<TNext> {
		return new AggregationBuilder<TNext>(this.baseSource, this.joins, [
			...this.operations,
			{
				kind: "mapRows",
				mapper: mapper as AggregationRowMapper<any, AnyRecord>,
			},
		]);
	}

	async execute(): Promise<TRow[]> {
		const sources = await this.loadSourceRows();
		let rows = sources[this.baseSource.as].map((row) => ({
			[this.baseSource.as]: row,
		})) as AnyRecord[];

		for (const join of this.joins) {
			rows = applyJoin(rows, sources[join.source.as], join);
		}

		for (const operation of this.operations) {
			rows = await this.applyOperation(rows, sources, operation);
		}

		return rows as TRow[];
	}

	private getSourceAliases(): string[] {
		return [this.baseSource.as, ...this.joins.map((join) => join.source.as)];
	}

	private async loadSourceRows(): Promise<Record<string, readonly AnyRecord[]>> {
		const loadedEntries = await Promise.all(
			[this.baseSource, ...this.joins.map((join) => join.source)].map(async (source) => [
				source.as,
				await loadSourceRows(source),
			] as const),
		);

		return Object.fromEntries(loadedEntries);
	}

	private async applyOperation(
		rows: AnyRecord[],
		sources: Record<string, readonly AnyRecord[]>,
		operation: AggregationOperation,
	): Promise<AnyRecord[]> {
		switch (operation.kind) {
			case "project":
				return mapRowsSequentially(rows, sources, this, async (row, context) => {
					return resolveProjection(operation.mapping, row, context);
				});

			case "alias":
				return mapRowsSequentially(rows, sources, this, async (row, context) => {
					return {
						...row,
						...(await resolveProjection(operation.mapping, row, context)),
					};
				});

			case "compute":
				return mapRowsSequentially(rows, sources, this, async (row, context) => ({
					...row,
					[operation.field]: await resolveValue(operation.resolver, row, context),
				}));

			case "computeMany":
				return mapRowsSequentially(rows, sources, this, async (row, context) => ({
					...row,
					...(await resolveProjection(operation.mapping, row, context)),
				}));

			case "mapRows":
				return mapRowsSequentially(rows, sources, this, operation.mapper);
		}
	}
}

export function createAggregation<
	TRow extends DefussRecord,
	O,
	Alias extends string = "base",
>(
	table: DefussTable<TRow, O>,
	options?: AggregationCreateOptions<Alias>,
): AggregationBuilder<AggregationNamespacedRow<Alias, TRow>>;
export function createAggregation<TRow extends AnyRecord, Alias extends string>(
	source: AggregationSource<TRow, Alias>,
): AggregationBuilder<AggregationNamespacedRow<Alias, TRow>>;
export function createAggregation<TRow extends AnyRecord, Alias extends string = "base">(
	rows: AggregationRowsLoader<TRow>,
	options?: Pick<AggregationCreateOptions<Alias>, "as">,
): AggregationBuilder<AggregationNamespacedRow<Alias, TRow>>;
export function createAggregation<TRow extends AnyRecord, Alias extends string = "base">(
	input:
		| DefussTable<TRow & DefussRecord, any>
		| AggregationSource<TRow, Alias>
		| AggregationRowsLoader<TRow>,
	options?: AggregationCreateOptions<Alias>,
): AggregationBuilder<AggregationNamespacedRow<Alias, TRow>> {
	const baseSource = normalizeBaseSource(input, options);
	assertUniqueAlias([], baseSource.as);
	return new AggregationBuilder<AggregationNamespacedRow<Alias, TRow>>(
		baseSource as AggregationSource<AnyRecord, string>,
	);
}

function normalizeBaseSource<TRow extends AnyRecord, Alias extends string>(
	input:
		| DefussTable<TRow & DefussRecord, any>
		| AggregationSource<TRow, Alias>
		| AggregationRowsLoader<TRow>,
	options?: AggregationCreateOptions<Alias>,
): AggregationSource<TRow, Alias> {
	if (isAggregationSource(input)) {
		return input;
	}

	if (isAggregationTable(input)) {
		return {
			table: input,
			as: (options?.as ?? "base") as Alias,
			where: options?.where,
		};
	}

	return {
		rows: input,
		as: (options?.as ?? "base") as Alias,
	};
}

function isAggregationTable(value: unknown): value is DefussTable<DefussRecord, any> {
	return (
		typeof value === "object" &&
		value !== null &&
		"find" in value &&
		"definition" in value &&
		typeof (value as { find?: unknown }).find === "function"
	);
}

function isAggregationSource(value: unknown): value is AggregationSource<any, string> {
	return (
		typeof value === "object" &&
		value !== null &&
		"as" in value &&
		(("table" in value && isAggregationTable((value as { table?: unknown }).table)) ||
			"rows" in value)
	);
}

async function loadSourceRows(source: AggregationSource<AnyRecord, string>): Promise<AnyRecord[]> {
	if ("table" in source) {
		return source.table.find(source.where ?? {});
	}

	const loadedRows =
		typeof source.rows === "function" ? await source.rows() : await source.rows;

	return [...loadedRows];
}

async function mapRowsSequentially(
	rows: AnyRecord[],
	sources: Record<string, readonly AnyRecord[]>,
	aggregation: AggregationBuilder<any>,
	mapper: AggregationRowMapper<any, AnyRecord>,
): Promise<AnyRecord[]> {
	const nextRows: AnyRecord[] = [];

	for (let index = 0; index < rows.length; index += 1) {
		const row = rows[index]!;
		nextRows.push(
			await mapper(row, {
				index,
				rows,
				sources,
				aggregation,
			}),
		);
	}

	return nextRows;
}

async function resolveProjection(
	mapping: AggregationProjectionMap<any>,
	row: AnyRecord,
	context: AggregationRowContext<any>,
): Promise<AnyRecord> {
	const projected: AnyRecord = {};

	for (const [field, resolver] of Object.entries(mapping)) {
		projected[field] = await resolveValue(resolver, row, context);
	}

	return projected;
}

async function resolveValue(
	resolver: AggregationValueResolver<any, unknown>,
	row: AnyRecord,
	context: AggregationRowContext<any>,
): Promise<unknown> {
	if (typeof resolver === "string") {
		return getValueAtPath(row, resolver);
	}

	return resolver(row, context);
}

function applyJoin(
	currentRows: AnyRecord[],
	joinedRows: readonly AnyRecord[],
	join: AggregationJoinDefinition,
): AnyRecord[] {
	if (join.spec.type === "right") {
		return applyRightJoin(currentRows, joinedRows, join);
	}

	const nextRows: AnyRecord[] = [];

	for (const currentRow of currentRows) {
		const matches = joinedRows.filter((joinedRow) =>
			valuesEqual(getValueAtPath(currentRow, join.spec.left), getValueAtPath(joinedRow, join.spec.right)),
		);

		if (matches.length === 0) {
			if (join.spec.type === "left") {
				nextRows.push({
					...currentRow,
					[join.source.as]: null,
				});
			}

			continue;
		}

		for (const match of matches) {
			nextRows.push({
				...currentRow,
				[join.source.as]: match,
			});
		}
	}

	return nextRows;
}

function applyRightJoin(
	currentRows: AnyRecord[],
	joinedRows: readonly AnyRecord[],
	join: AggregationJoinDefinition,
): AnyRecord[] {
	const nextRows: AnyRecord[] = [];
	const currentRowTemplate = currentRows[0];

	for (const joinedRow of joinedRows) {
		const matches = currentRows.filter((currentRow) =>
			valuesEqual(getValueAtPath(currentRow, join.spec.left), getValueAtPath(joinedRow, join.spec.right)),
		);

		if (matches.length === 0) {
			nextRows.push({
				...createNullRow(currentRowTemplate),
				[join.source.as]: joinedRow,
			});
			continue;
		}

		for (const match of matches) {
			nextRows.push({
				...match,
				[join.source.as]: joinedRow,
			});
		}
	}

	return nextRows;
}

function createNullRow(row: AnyRecord | undefined): AnyRecord {
	if (!row) {
		return {};
	}

	const nextRow: AnyRecord = {};
	for (const key of Object.keys(row)) {
		nextRow[key] = null;
	}

	return nextRow;
}

function getValueAtPath(target: unknown, path: string): unknown {
	if (!path) {
		return undefined;
	}

	let current = target;
	for (const segment of path.split(".").filter(Boolean)) {
		if (current === null) {
			return null;
		}

		if (current === undefined || typeof current !== "object") {
			return undefined;
		}

		current = (current as Record<string, unknown>)[segment];
	}

	return current;
}

function valuesEqual(left: unknown, right: unknown): boolean {
	if (left instanceof Date && right instanceof Date) {
		return left.getTime() === right.getTime();
	}

	if (left instanceof ArrayBuffer && right instanceof ArrayBuffer) {
		if (left.byteLength !== right.byteLength) {
			return false;
		}

		const leftView = new Uint8Array(left);
		const rightView = new Uint8Array(right);
		for (let index = 0; index < leftView.length; index += 1) {
			if (leftView[index] !== rightView[index]) {
				return false;
			}
		}

		return true;
	}

	return left === right;
}

function assertUniqueAlias(existingAliases: string[], alias: string): void {
	if (!alias.trim()) {
		throw new Error("defuss-db aggregation: source aliases must be non-empty.");
	}

	if (existingAliases.includes(alias)) {
		throw new Error(`defuss-db aggregation: source alias '${alias}' is already in use.`);
	}
}