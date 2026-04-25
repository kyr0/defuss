import type { DefussSelector, DefussRecord } from "../types.js";

type AnyRecord = Record<string, unknown>;

type Awaitable<TValue> = TValue | Promise<TValue>;

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
	table: AggregationTableLike<TRow>;
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

export interface AggregationMergeContext<TRow extends AnyRecord> {
	index: number;
	rows: readonly TRow[];
	sources: Readonly<Record<string, readonly AnyRecord[]>>;
	aggregation: AggregationBuilder<any>;
}

export interface AggregationGroupContext<
	TRow extends AnyRecord,
	TKeyRow extends AnyRecord = AnyRecord,
> {
	key: Readonly<TKeyRow>;
	rows: readonly TRow[];
	sources: Readonly<Record<string, readonly AnyRecord[]>>;
	aggregation: AggregationBuilder<any>;
}

export interface AggregationSortContext<TRow extends AnyRecord> {
	rows: readonly TRow[];
	sources: Readonly<Record<string, readonly AnyRecord[]>>;
	aggregation: AggregationBuilder<any>;
}

export type AggregationValueResolver<TRow extends AnyRecord, TValue> =
	| string
	| ((row: Readonly<TRow>, context: AggregationRowContext<TRow>) => Awaitable<TValue>);

export type AggregationProjectionMap<TRow extends AnyRecord> = Record<
	string,
	AggregationValueResolver<TRow, unknown>
>;

export type AggregationRowMapper<TRow extends AnyRecord, TNext extends AnyRecord> = (
	row: Readonly<TRow>,
	context: AggregationRowContext<TRow>,
) => Awaitable<TNext>;

export type AggregationRemoveFieldsInput<TRow extends AnyRecord> =
	| readonly string[]
	| ((
			row: Readonly<TRow>,
			context: AggregationRowContext<TRow>,
	  ) => Awaitable<readonly string[]>);

export type AggregationMergeRowsResult<TNext extends AnyRecord> =
	| TNext
	| null
	| undefined;

export type AggregationMergeRowsFn<TRow extends AnyRecord, TNext extends AnyRecord> = (
	left: Readonly<TRow>,
	right: Readonly<TRow>,
	context: AggregationMergeContext<TRow>,
) => Awaitable<AggregationMergeRowsResult<TNext>>;

export type AggregationDistinctSelector<TRow extends AnyRecord> =
	| string
	| readonly string[]
	| ((
			row: Readonly<TRow>,
			context: AggregationRowContext<TRow>,
	  ) => Awaitable<unknown | readonly unknown[]>);

export interface AggregationDistinctOptions {
	keep?: "first" | "last";
}

export type AggregationGroupKeys<TRow extends AnyRecord> =
	| string
	| readonly string[]
	| AggregationProjectionMap<TRow>;

export type AggregationGroupReducer<
	TRow extends AnyRecord,
	TValue = unknown,
	TKeyRow extends AnyRecord = AnyRecord,
> = (
	rows: readonly TRow[],
	context: AggregationGroupContext<TRow, TKeyRow>,
) => Awaitable<TValue>;

type AggregationReducerMap<
	TRow extends AnyRecord,
	TKeyRow extends AnyRecord = AnyRecord,
> = Record<string, AggregationGroupReducer<TRow, unknown, TKeyRow>>;

type AggregationReducerResult<TReducers extends AggregationReducerMap<any, any>> = {
	[K in keyof TReducers]: Awaited<ReturnType<TReducers[K]>>;
};

export type AggregationSortDirection = "asc" | "desc";

export interface AggregationFieldSortSpec {
	field: string;
	direction?: AggregationSortDirection;
}

export interface AggregationResolverSortSpec<TRow extends AnyRecord> {
	by: AggregationValueResolver<TRow, unknown>;
	direction?: AggregationSortDirection;
}

export type AggregationSortSpec<TRow extends AnyRecord> =
	| AggregationFieldSortSpec
	| AggregationResolverSortSpec<TRow>;

export type AggregationSortComparator<TRow extends AnyRecord> = (
	left: Readonly<TRow>,
	right: Readonly<TRow>,
	context: AggregationSortContext<TRow>,
) => Awaitable<number>;

export interface AggregationTableLike<TRow extends DefussRecord = DefussRecord> {
	find(selector?: DefussSelector): Promise<TRow[]>;
	definition: unknown;
}

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
	}
	| {
		kind: "removeFields";
		paths: AggregationRemoveFieldsInput<any>;
	}
	| {
		kind: "mergeConsecutive";
		merger: AggregationMergeRowsFn<any, AnyRecord>;
	}
	| {
		kind: "distinctBy";
		selector: AggregationDistinctSelector<any>;
		options: AggregationDistinctOptions;
	}
	| {
		kind: "groupBy";
		keys: AggregationGroupKeys<any>;
		reducers: AggregationReducerMap<any, AnyRecord>;
	}
	| {
		kind: "sortBy";
		specs?: AggregationSortSpec<any>[];
		comparator?: AggregationSortComparator<any>;
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

	removeFields(paths: AggregationRemoveFieldsInput<TRow>): AggregationBuilder<TRow> {
		return new AggregationBuilder<TRow>(this.baseSource, this.joins, [
			...this.operations,
			{
				kind: "removeFields",
				paths: paths as AggregationRemoveFieldsInput<any>,
			},
		]);
	}

	mergeConsecutive<TNext extends AnyRecord = TRow>(
		merger: AggregationMergeRowsFn<TRow, TNext>,
	): AggregationBuilder<TNext> {
		return new AggregationBuilder<TNext>(this.baseSource, this.joins, [
			...this.operations,
			{
				kind: "mergeConsecutive",
				merger: merger as AggregationMergeRowsFn<any, AnyRecord>,
			},
		]);
	}

	distinctBy(
		selector: AggregationDistinctSelector<TRow>,
		options: AggregationDistinctOptions = {},
	): AggregationBuilder<TRow> {
		return new AggregationBuilder<TRow>(this.baseSource, this.joins, [
			...this.operations,
			{
				kind: "distinctBy",
				selector: selector as AggregationDistinctSelector<any>,
				options,
			},
		]);
	}

	groupBy<
		TKeyProjection extends AggregationProjectionMap<TRow>,
		TReducers extends AggregationReducerMap<TRow, ProjectionResult<TKeyProjection>>,
	>(
		keys: TKeyProjection,
		reducers: TReducers,
	): AggregationBuilder<MergeShape<ProjectionResult<TKeyProjection>, AggregationReducerResult<TReducers>>>;
	groupBy<
		TKey extends string,
		TReducers extends AggregationReducerMap<TRow, Record<TKey, unknown>>,
	>(
		keys: TKey | readonly TKey[],
		reducers: TReducers,
	): AggregationBuilder<Record<TKey, unknown> & AggregationReducerResult<TReducers>>;
	groupBy(
		keys: AggregationGroupKeys<TRow>,
		reducers: AggregationReducerMap<TRow, AnyRecord>,
	): AggregationBuilder<AnyRecord> {
		return new AggregationBuilder<AnyRecord>(this.baseSource, this.joins, [
			...this.operations,
			{
				kind: "groupBy",
				keys: keys as AggregationGroupKeys<any>,
				reducers: reducers as AggregationReducerMap<any, AnyRecord>,
			},
		]);
	}

	sortBy(comparator: AggregationSortComparator<TRow>): AggregationBuilder<TRow>;
	sortBy(specs: AggregationSortSpec<TRow> | readonly AggregationSortSpec<TRow>[]): AggregationBuilder<TRow>;
	sortBy(
		input:
			| AggregationSortComparator<TRow>
			| AggregationSortSpec<TRow>
			| readonly AggregationSortSpec<TRow>[],
	): AggregationBuilder<TRow> {
		return new AggregationBuilder<TRow>(this.baseSource, this.joins, [
			...this.operations,
			isSortComparator(input)
				? {
					kind: "sortBy",
					comparator: input as AggregationSortComparator<any>,
				}
				: {
					kind: "sortBy",
					specs: normalizeSortSpecs(
						input as AggregationSortSpec<TRow> | readonly AggregationSortSpec<TRow>[],
					),
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
				return mapRowsSequentially(rows, sources, this, async (row, context) =>
					resolveProjection(operation.mapping, row, context),
				);

			case "alias":
				return mapRowsSequentially(rows, sources, this, async (row, context) => ({
					...row,
					...(await resolveProjection(operation.mapping, row, context)),
				}));

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

			case "removeFields":
				return mapRowsSequentially(rows, sources, this, async (row, context) => {
					const paths = await resolveRemovePaths(operation.paths, row, context);
					return removePathsFromRow(row, paths);
				});

			case "mergeConsecutive":
				return mergeRowsSequentially(rows, sources, this, operation.merger);

			case "distinctBy":
				return distinctRows(rows, sources, this, operation.selector, operation.options);

			case "groupBy":
				return groupRows(rows, sources, this, operation.keys, operation.reducers);

			case "sortBy":
				return sortRows(rows, sources, this, operation);
		}
	}
}

export function createAggregation<
	TRow extends DefussRecord,
	Alias extends string = "base",
>(
	table: AggregationTableLike<TRow>,
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
		| AggregationTableLike<TRow & DefussRecord>
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

export function countRows<TRow extends AnyRecord>(): AggregationGroupReducer<TRow, number> {
	return (rows) => rows.length;
}

export function sumBy<TRow extends AnyRecord>(
	resolver: AggregationValueResolver<TRow, unknown>,
): AggregationGroupReducer<TRow, number> {
	return async (rows, context) => {
		let total = 0;

		for (let index = 0; index < rows.length; index += 1) {
			const value = await resolveValue(
				resolver as AggregationValueResolver<any, unknown>,
				rows[index] as AnyRecord,
				createRowContext(index, rows as readonly AnyRecord[], context.sources, context.aggregation),
			);

			if (typeof value === "number") {
				total += value;
			}
		}

		return total;
	};
}

export function avgBy<TRow extends AnyRecord>(
	resolver: AggregationValueResolver<TRow, unknown>,
): AggregationGroupReducer<TRow, number> {
	return async (rows, context) => {
		let total = 0;
		let count = 0;

		for (let index = 0; index < rows.length; index += 1) {
			const value = await resolveValue(
				resolver as AggregationValueResolver<any, unknown>,
				rows[index] as AnyRecord,
				createRowContext(index, rows as readonly AnyRecord[], context.sources, context.aggregation),
			);

			if (typeof value === "number") {
				total += value;
				count += 1;
			}
		}

		return count === 0 ? 0 : total / count;
	};
}

export function minBy<TRow extends AnyRecord>(
	resolver: AggregationValueResolver<TRow, unknown>,
): AggregationGroupReducer<TRow, unknown> {
	return async (rows, context) => {
		let minimum: unknown = undefined;

		for (let index = 0; index < rows.length; index += 1) {
			const value = await resolveValue(
				resolver as AggregationValueResolver<any, unknown>,
				rows[index] as AnyRecord,
				createRowContext(index, rows as readonly AnyRecord[], context.sources, context.aggregation),
			);

			if (minimum === undefined || compareSortValues(value, minimum, "asc") < 0) {
				minimum = value;
			}
		}

		return minimum;
	};
}

export function maxBy<TRow extends AnyRecord>(
	resolver: AggregationValueResolver<TRow, unknown>,
): AggregationGroupReducer<TRow, unknown> {
	return async (rows, context) => {
		let maximum: unknown = undefined;

		for (let index = 0; index < rows.length; index += 1) {
			const value = await resolveValue(
				resolver as AggregationValueResolver<any, unknown>,
				rows[index] as AnyRecord,
				createRowContext(index, rows as readonly AnyRecord[], context.sources, context.aggregation),
			);

			if (maximum === undefined || compareSortValues(value, maximum, "desc") < 0) {
				maximum = value;
			}
		}

		return maximum;
	};
}

export function firstBy<TRow extends AnyRecord>(
	resolver?: AggregationValueResolver<TRow, unknown>,
): AggregationGroupReducer<TRow, unknown> {
	return async (rows, context) => {
		const row = rows[0];
		if (!row) {
			return undefined;
		}

		if (!resolver) {
			return row;
		}

		return resolveValue(
			resolver as AggregationValueResolver<any, unknown>,
			row as AnyRecord,
			createRowContext(0, rows as readonly AnyRecord[], context.sources, context.aggregation),
		);
	};
}

export function lastBy<TRow extends AnyRecord>(
	resolver?: AggregationValueResolver<TRow, unknown>,
): AggregationGroupReducer<TRow, unknown> {
	return async (rows, context) => {
		const index = rows.length - 1;
		const row = rows[index];
		if (!row) {
			return undefined;
		}

		if (!resolver) {
			return row;
		}

		return resolveValue(
			resolver as AggregationValueResolver<any, unknown>,
			row as AnyRecord,
			createRowContext(index, rows as readonly AnyRecord[], context.sources, context.aggregation),
		);
	};
}

export const aggregationReducers = {
	count: countRows,
	sum: sumBy,
	avg: avgBy,
	min: minBy,
	max: maxBy,
	first: firstBy,
	last: lastBy,
};

function normalizeBaseSource<TRow extends AnyRecord, Alias extends string>(
	input:
		| AggregationTableLike<TRow & DefussRecord>
		| AggregationSource<TRow, Alias>
		| AggregationRowsLoader<TRow>,
	options?: AggregationCreateOptions<Alias>,
): AggregationSource<TRow, Alias> {
	if (isAggregationSource(input)) {
		return input;
	}

	if (isAggregationTable(input)) {
		const table = input as AggregationTableLike<TRow & DefussRecord>;
		return {
			table,
			as: (options?.as ?? "base") as Alias,
			where: options?.where,
		};
	}

	return {
		rows: input as AggregationRowsLoader<TRow>,
		as: (options?.as ?? "base") as Alias,
	};
}

function isAggregationTable(value: unknown): value is AggregationTableLike<DefussRecord> {
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
		nextRows.push(
			await mapper(rows[index]!, createRowContext(index, rows, sources, aggregation)),
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

async function resolveRemovePaths(
	paths: AggregationRemoveFieldsInput<any>,
	row: AnyRecord,
	context: AggregationRowContext<any>,
): Promise<readonly string[]> {
	if (Array.isArray(paths)) {
		return paths;
	}

	return (paths as Exclude<AggregationRemoveFieldsInput<any>, readonly string[]>)(row, context);
}

async function mergeRowsSequentially(
	rows: AnyRecord[],
	sources: Record<string, readonly AnyRecord[]>,
	aggregation: AggregationBuilder<any>,
	merger: AggregationMergeRowsFn<any, AnyRecord>,
): Promise<AnyRecord[]> {
	const nextRows: AnyRecord[] = [];

	for (let index = 0; index < rows.length; index += 1) {
		const currentRow = rows[index]!;

		if (nextRows.length === 0) {
			nextRows.push(currentRow);
			continue;
		}

		const merged = await merger(nextRows[nextRows.length - 1]!, currentRow, {
			index,
			rows,
			sources,
			aggregation,
		});

		if (merged === null || merged === undefined) {
			nextRows.push(currentRow);
			continue;
		}

		nextRows[nextRows.length - 1] = merged;
	}

	return nextRows;
}

async function distinctRows(
	rows: AnyRecord[],
	sources: Record<string, readonly AnyRecord[]>,
	aggregation: AggregationBuilder<any>,
	selector: AggregationDistinctSelector<any>,
	options: AggregationDistinctOptions,
): Promise<AnyRecord[]> {
	const keep = options.keep ?? "first";

	if (keep === "last") {
		const lastSeen = new Map<string, number>();
		const keys: string[] = [];

		for (let index = 0; index < rows.length; index += 1) {
			const key = await resolveDistinctKey(
				selector,
				rows[index]!,
				createRowContext(index, rows, sources, aggregation),
			);

			keys.push(key);
			lastSeen.set(key, index);
		}

		return rows.filter((_, index) => lastSeen.get(keys[index]!) === index);
	}

	const nextRows: AnyRecord[] = [];
	const seen = new Set<string>();

	for (let index = 0; index < rows.length; index += 1) {
		const key = await resolveDistinctKey(
			selector,
			rows[index]!,
			createRowContext(index, rows, sources, aggregation),
		);

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		nextRows.push(rows[index]!);
	}

	return nextRows;
}

async function groupRows(
	rows: AnyRecord[],
	sources: Record<string, readonly AnyRecord[]>,
	aggregation: AggregationBuilder<any>,
	keys: AggregationGroupKeys<any>,
	reducers: AggregationReducerMap<any, AnyRecord>,
): Promise<AnyRecord[]> {
	const groups = new Map<string, { key: AnyRecord; rows: AnyRecord[] }>();

	for (let index = 0; index < rows.length; index += 1) {
		const row = rows[index]!;
		const keyRow = await resolveGroupKeyRow(
			keys,
			row,
			createRowContext(index, rows, sources, aggregation),
		);
		const serializedKey = await serializeKeyParts([keyRow]);
		const existing = groups.get(serializedKey);

		if (existing) {
			existing.rows.push(row);
			continue;
		}

		groups.set(serializedKey, {
			key: keyRow,
			rows: [row],
		});
	}

	const nextRows: AnyRecord[] = [];
	for (const group of groups.values()) {
		const groupedRow: AnyRecord = { ...group.key };
		const groupContext: AggregationGroupContext<any, AnyRecord> = {
			key: group.key,
			rows: group.rows,
			sources,
			aggregation,
		};

		for (const [field, reducer] of Object.entries(reducers)) {
			groupedRow[field] = await reducer(group.rows, groupContext);
		}

		nextRows.push(groupedRow);
	}

	return nextRows;
}

async function sortRows(
	rows: AnyRecord[],
	sources: Record<string, readonly AnyRecord[]>,
	aggregation: AggregationBuilder<any>,
	operation: Extract<AggregationOperation, { kind: "sortBy" }>,
): Promise<AnyRecord[]> {
	if (operation.comparator) {
		return stableSortAsync(rows, async (left, right) =>
			operation.comparator!(left, right, {
				rows,
				sources,
				aggregation,
			}),
		);
	}

	const specs = operation.specs ?? [];
	if (specs.length === 0) {
		return [...rows];
	}

	const decorated = await Promise.all(
		rows.map(async (row, index) => ({
			row,
			index,
			keys: await Promise.all(
				specs.map((spec) =>
					resolveSortValue(spec, row, createRowContext(index, rows, sources, aggregation)),
				),
			),
		})),
	);

	decorated.sort((left, right) => {
		for (let index = 0; index < specs.length; index += 1) {
			const compared = compareSortValues(
				left.keys[index],
				right.keys[index],
				specs[index]!.direction ?? "asc",
			);

			if (compared !== 0) {
				return compared;
			}
		}

		return left.index - right.index;
	});

	return decorated.map((entry) => entry.row);
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
			valuesEqual(
				getValueAtPath(currentRow, join.spec.left),
				getValueAtPath(joinedRow, join.spec.right),
			),
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
			valuesEqual(
				getValueAtPath(currentRow, join.spec.left),
				getValueAtPath(joinedRow, join.spec.right),
			),
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

function removePathsFromRow(row: AnyRecord, paths: readonly string[]): AnyRecord {
	let nextRow = row;

	for (const path of paths) {
		nextRow = removePath(nextRow, path);
	}

	return nextRow;
}

function removePath(row: AnyRecord, path: string): AnyRecord {
	const segments = path.split(".").filter(Boolean);
	if (segments.length === 0) {
		return row;
	}

	const nextRow = cloneContainer(row) as AnyRecord;
	let sourceCursor: unknown = row;
	let targetCursor: AnyRecord = nextRow;

	for (let index = 0; index < segments.length - 1; index += 1) {
		if (sourceCursor === null || sourceCursor === undefined || typeof sourceCursor !== "object") {
			return nextRow;
		}

		const segment = segments[index]!;
		const sourceValue = (sourceCursor as Record<string, unknown>)[segment];
		if (sourceValue === null || sourceValue === undefined || typeof sourceValue !== "object") {
			return nextRow;
		}

		targetCursor[segment] = cloneContainer(sourceValue) as AnyRecord;
		targetCursor = targetCursor[segment] as AnyRecord;
		sourceCursor = sourceValue;
	}

	delete targetCursor[segments[segments.length - 1]!];
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

async function resolveDistinctKey(
	selector: AggregationDistinctSelector<any>,
	row: AnyRecord,
	context: AggregationRowContext<any>,
): Promise<string> {
	if (typeof selector === "string") {
		return serializeKeyParts([getValueAtPath(row, selector)]);
	}

	if (Array.isArray(selector)) {
		return serializeKeyParts(selector.map((path) => getValueAtPath(row, path)));
	}

	const resolved = await (
		selector as Exclude<AggregationDistinctSelector<any>, string | readonly string[]>
	)(row, context);
	return serializeKeyParts(Array.isArray(resolved) ? resolved : [resolved]);
}

async function resolveGroupKeyRow(
	keys: AggregationGroupKeys<any>,
	row: AnyRecord,
	context: AggregationRowContext<any>,
): Promise<AnyRecord> {
	if (typeof keys === "string") {
		return {
			[keys]: getValueAtPath(row, keys),
		};
	}

	if (Array.isArray(keys)) {
		const keyRow: AnyRecord = {};
		for (const key of keys) {
			keyRow[key] = getValueAtPath(row, key);
		}

		return keyRow;
	}

	return resolveProjection(keys as AggregationProjectionMap<any>, row, context);
}

async function resolveSortValue(
	spec: AggregationSortSpec<any>,
	row: AnyRecord,
	context: AggregationRowContext<any>,
): Promise<unknown> {
	if (isFieldSortSpec(spec)) {
		return getValueAtPath(row, spec.field);
	}

	return resolveValue(spec.by, row, context);
}

function isFieldSortSpec(spec: AggregationSortSpec<any>): spec is AggregationFieldSortSpec {
	return "field" in spec;
}

function isSortComparator(value: unknown): value is AggregationSortComparator<any> {
	return typeof value === "function";
}

function normalizeSortSpecs<TRow extends AnyRecord>(
	input: AggregationSortSpec<TRow> | readonly AggregationSortSpec<TRow>[],
): AggregationSortSpec<TRow>[] {
	if (Array.isArray(input)) {
		return [...input];
	}

	return [input as AggregationSortSpec<TRow>];
}

async function stableSortAsync(
	rows: AnyRecord[],
	comparator: (left: AnyRecord, right: AnyRecord) => Awaitable<number>,
): Promise<AnyRecord[]> {
	if (rows.length <= 1) {
		return [...rows];
	}

	const midpoint = Math.floor(rows.length / 2);
	const leftRows = await stableSortAsync(rows.slice(0, midpoint), comparator);
	const rightRows = await stableSortAsync(rows.slice(midpoint), comparator);

	return mergeSortedRows(leftRows, rightRows, comparator);
}

async function mergeSortedRows(
	leftRows: AnyRecord[],
	rightRows: AnyRecord[],
	comparator: (left: AnyRecord, right: AnyRecord) => Awaitable<number>,
): Promise<AnyRecord[]> {
	const merged: AnyRecord[] = [];
	let leftIndex = 0;
	let rightIndex = 0;

	while (leftIndex < leftRows.length && rightIndex < rightRows.length) {
		if ((await comparator(leftRows[leftIndex]!, rightRows[rightIndex]!)) <= 0) {
			merged.push(leftRows[leftIndex]!);
			leftIndex += 1;
			continue;
		}

		merged.push(rightRows[rightIndex]!);
		rightIndex += 1;
	}

	return [...merged, ...leftRows.slice(leftIndex), ...rightRows.slice(rightIndex)];
}

function compareSortValues(left: unknown, right: unknown, direction: AggregationSortDirection): number {
	const factor = direction === "desc" ? -1 : 1;

	if (left === right) {
		return 0;
	}

	if (left === null || left === undefined) {
		return 1 * factor;
	}

	if (right === null || right === undefined) {
		return -1 * factor;
	}

	if (left instanceof Date && right instanceof Date) {
		return comparePrimitiveValues(left.getTime(), right.getTime()) * factor;
	}

	if (typeof left === "number" && typeof right === "number") {
		return comparePrimitiveValues(left, right) * factor;
	}

	if (typeof left === "bigint" && typeof right === "bigint") {
		return comparePrimitiveValues(left, right) * factor;
	}

	if (typeof left === "boolean" && typeof right === "boolean") {
		return comparePrimitiveValues(Number(left), Number(right)) * factor;
	}

	return String(left).localeCompare(String(right)) * factor;
}

function comparePrimitiveValues<TValue extends number | bigint>(left: TValue, right: TValue): number {
	if (left < right) {
		return -1;
	}

	if (left > right) {
		return 1;
	}

	return 0;
}

async function serializeKeyParts(parts: readonly unknown[]): Promise<string> {
	const normalized = await Promise.all(parts.map((part) => normalizeKeyPart(part)));
	return JSON.stringify(normalized);
}

async function normalizeKeyPart(value: unknown): Promise<unknown> {
	if (value instanceof Date) {
		return {
			__defussType: "date",
			value: value.toISOString(),
		};
	}

	if (typeof value === "bigint") {
		return {
			__defussType: "bigint",
			value: String(value),
		};
	}

	if (value instanceof ArrayBuffer) {
		return {
			__defussType: "arraybuffer",
			value: Array.from(new Uint8Array(value)),
		};
	}

	if (isBlobLike(value)) {
		return {
			__defussType: "blob",
			type: value.type,
			value: Array.from(new Uint8Array(await value.arrayBuffer())),
		};
	}

	if (Array.isArray(value)) {
		return Promise.all(value.map((item) => normalizeKeyPart(item)));
	}

	if (typeof value === "object" && value !== null) {
		const entries = await Promise.all(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(async ([key, nestedValue]) => [key, await normalizeKeyPart(nestedValue)] as const),
		);

		return Object.fromEntries(entries);
	}

	return value;
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

function createRowContext(
	index: number,
	rows: readonly AnyRecord[],
	sources: Record<string, readonly AnyRecord[]>,
	aggregation: AggregationBuilder<any>,
): AggregationRowContext<any> {
	return {
		index,
		rows,
		sources,
		aggregation,
	};
}

function cloneContainer(value: unknown): AnyRecord | unknown[] {
	if (Array.isArray(value)) {
		return [...value];
	}

	return { ...(value as AnyRecord) };
}

function isBlobLike(value: unknown): value is Blob {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Blob).arrayBuffer === "function" &&
		typeof (value as Blob).slice === "function" &&
		typeof (value as Blob).type === "string"
	);
}

function assertUniqueAlias(existingAliases: string[], alias: string): void {
	if (!alias.trim()) {
		throw new Error("defuss-db aggregation: source aliases must be non-empty.");
	}

	if (existingAliases.includes(alias)) {
		throw new Error(`defuss-db aggregation: source alias '${alias}' is already in use.`);
	}
}
