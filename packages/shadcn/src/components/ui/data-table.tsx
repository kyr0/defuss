import type { ElementProps, FC, Ref } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";
import { createClickGuard } from "../../utilities/click-guard.js";
import type { DataviewEntry, DataviewState } from "defuss-dataview";

// -- Types --------------------------------------------------------------

export interface DataTableColumn {
	/** Field key in each data row */
	field: string;
	/** Column header label */
	label: string;
	/** Whether clicking the header should fire `onSort` */
	sortable?: boolean;
	/** Extra classes on both `<th>` and `<td>` cells */
	className?: string;
	/** Custom cell renderer */
	render?: (value: unknown, entry: DataviewEntry) => JSX.Element;
	/** Custom header renderer (overrides default label + sort indicator) */
	renderHeader?: (
		col: DataTableColumn,
		sortField?: string,
		sortDirection?: string,
	) => JSX.Element;
}

export type DataTableProps = ElementProps<HTMLDivElement> & {
	/** Flat list of entries from `applyDataview()` */
	entries: DataviewEntry[];
	/** Column definitions */
	columns: DataTableColumn[];
	/**
	 * Optional dataview state. When provided, `sortField`, `sortDirection`, and
	 * `idField` are derived from it automatically unless explicitly overridden.
	 */
	dataview?: DataviewState;
	/** Currently sorted field (to show indicator). Overrides `dataview.sorters[0].field`. */
	sortField?: string;
	/** Current sort direction. Overrides `dataview.sorters[0].direction`. */
	sortDirection?: "asc" | "desc";
	/** Called when a sortable column header is clicked */
	onSort?: (field: string) => void;
	/** Called when a row is clicked */
	onRowClick?: (entry: DataviewEntry) => void;
	/** Optional actions column renderer (last column) */
	renderActions?: (entry: DataviewEntry) => JSX.Element;
	/** Optional custom header for the actions column (overrides default "Actions" label) */
	renderActionsHeader?: () => JSX.Element;
	/** Field used as the row key (default: "id", or derived from `dataview.idField`). */
	idField?: string;
	/** Message shown when entries is empty */
	emptyMessage?: string;
};

// -- Component ----------------------------------------------------------

const allowClick = createClickGuard();

export const DataTable: FC<DataTableProps> = ({
	className,
	entries,
	columns,
	dataview,
	sortField: sortFieldProp,
	sortDirection: sortDirectionProp,
	onSort,
	onRowClick,
	renderActions,
	renderActionsHeader,
	idField: idFieldProp,
	emptyMessage = "No results found.",
	ref = createRef() as Ref<HTMLDivElement>,
	...props
}) => {
	const tableRef = ref || createRef<HTMLDivElement>();

	// Derive sort and idField from the dataview prop when not explicitly set.
	const sortField = sortFieldProp ?? dataview?.sorters[0]?.field;
	const sortDirection = sortDirectionProp ?? dataview?.sorters[0]?.direction ?? "asc";
	const idField = idFieldProp ?? dataview?.idField ?? "id";

	// Delegated click handler on the root wrapper
	const handleClick = (e: MouseEvent) => {
		if (!allowClick(e)) return;
		const target = e.target as HTMLElement;

		// Sortable column header
		const th = target.closest("th[data-sortable]") as HTMLElement | null;
		if (th) {
			const field = th.dataset.field;
			if (field) onSort?.(field);
			return;
		}

		// Action buttons live inside rows but should NOT trigger onRowClick
		if (target.closest(".data-table-actions")) return;

		// Row click
		const tr = target.closest("tr[data-row-id]") as HTMLElement | null;
		if (tr && onRowClick) {
			const rowId = tr.dataset.rowId;
			const entry = entries.find((e) => String(e.row[idField]) === rowId);
			if (entry) onRowClick(entry);
		}
	};

	return (
		<div
			ref={tableRef}
			class={cn("data-table rounded-md border overflow-x-auto", className)}
			onClick={handleClick}
			{...props}
		>
			<table class="table w-full">
				<thead>
					<tr>
						{columns.map((col) => {
							const isSorted = sortField === col.field;
							return (
								<th
									key={col.field}
									data-field={col.field}
									data-sortable={col.sortable ? "" : undefined}
									class={cn(
										col.sortable && "data-table-sortable-header",
										col.className,
									)}
								>
									{col.renderHeader ? (
										col.renderHeader(col, sortField, sortDirection)
									) : (
										<div class="flex items-center select-none">
											{col.label}
											{col.sortable && isSorted && (
												<span class="ml-1">
													{sortDirection === "asc" ? "\u25B2" : "\u25BC"}
												</span>
											)}
										</div>
									)}
								</th>
							);
						})}
						{renderActions && (
							renderActionsHeader ? renderActionsHeader() : (
								<th>
									<div class="flex justify-end select-none">Actions</div>
								</th>
							)
						)}
					</tr>
				</thead>
				<tbody>
					{entries.length > 0 ? (
						entries.map((entry) => {
							const rowKey = String(entry.row[idField] ?? "");
							return (
								<tr
									key={rowKey}
									data-row-id={rowKey}
									class={onRowClick ? "data-table-row-clickable" : undefined}
								>
									{columns.map((col) => {
										const value = entry.row[col.field];
										return (
											<td key={col.field} class={cn(col.className)}>
												{col.render ? (
													col.render(value, entry)
												) : (
													<span>{String(value ?? "")}</span>
												)}
											</td>
										);
									})}
									{renderActions && (
										<td class="text-right">
											<div class="data-table-actions flex justify-end gap-2">
												{renderActions(entry)}
											</div>
										</td>
									)}
								</tr>
							);
						})
					) : (
						<tr>
							<td
								colSpan={columns.length + (renderActions ? 1 : 0)}
								class="text-center py-8 data-table-empty"
							>
								{emptyMessage}
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
};
