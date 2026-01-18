import { createRef, $, type VNode } from "defuss";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Button,
    Icon,
    Input,
} from "../../cl";
import { Pagination, PaginationItem } from "../../cl/components/pagination";

export interface Column<T> {
    key: keyof T | string;
    label: string;
    render?: (item: T) => VNode;
    width?: "small" | "medium" | "large";
    shrink?: boolean;
    searchable?: boolean; // Include this column in search
}

export interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyField: keyof T;
    searchable?: boolean;
    searchPlaceholder?: string;
    onSearch?: (query: string) => void;
    actions?: (item: T) => VNode;
    emptyMessage?: string;
    loading?: boolean;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
    };
}

export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    keyField,
    searchable = false,
    searchPlaceholder = "Search...",
    onSearch,
    actions,
    emptyMessage = "No data available",
    loading = false,
    pagination,
}: DataTableProps<T>) {
    const searchRef = createRef();
    const searchQueryRef = createRef<{ query: string }>(undefined, { query: "" });
    const containerRef = createRef();

    // Client-side search filtering
    const getFilteredData = () => {
        const query = searchQueryRef.state?.query?.toLowerCase() || "";
        if (!query) return data;

        return data.filter((item) => {
            // Search in all string/number columns
            for (const col of columns) {
                const value = item[col.key as keyof T];
                if (value != null) {
                    const strValue = String(value).toLowerCase();
                    if (strValue.includes(query)) {
                        return true;
                    }
                }
            }
            return false;
        });
    };

    const handleSearch = () => {
        const input = searchRef.current as HTMLInputElement;
        const query = input?.value || "";

        if (onSearch) {
            // External search handler
            onSearch(query);
        } else {
            // Client-side filtering
            searchQueryRef.updateState({ query });
            rerender();
        }
    };

    const handleSearchInput = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const query = input?.value || "";

        if (!onSearch) {
            // Client-side filtering on input
            searchQueryRef.updateState({ query });
            rerender();
        }
    };

    const rerender = () => {
        $(containerRef).update(renderTable());
    };

    const filteredData = onSearch ? data : getFilteredData();
    const totalPages = pagination
        ? Math.ceil(pagination.total / pagination.pageSize)
        : 0;

    const renderTable = () => {
        const displayData = onSearch ? data : getFilteredData();

        return (
            <>
                {/* Table */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead key={String(col.key)} width={col.width} shrink={col.shrink}>
                                    {col.label}
                                </TableHead>
                            ))}
                            {actions && <TableHead shrink>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="text-center py-8"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="uk-spinner" />
                                        <span>Loading...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : displayData.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length + (actions ? 1 : 0)}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    {searchQueryRef.state?.query ? "No matching results" : emptyMessage}
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayData.map((item) => (
                                <TableRow key={String(item[keyField])}>
                                    {columns.map((col) => (
                                        <TableCell key={`${item[keyField]}-${String(col.key)}`}>
                                            {col.render
                                                ? col.render(item)
                                                : String(item[col.key as keyof T] ?? "")}
                                        </TableCell>
                                    ))}
                                    {actions && <TableCell>{actions(item)}</TableCell>}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && totalPages > 1 && (
                    <div className="flex justify-center mt-4">
                        <Pagination>
                            <PaginationItem
                                prev
                                disabled={pagination.page <= 1}
                                onClick={() => pagination.onPageChange(pagination.page - 1)}
                                aria-label="Previous page"
                            />
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = pagination.page - 2 + i;
                                }
                                return (
                                    <PaginationItem
                                        key={String(pageNum)}
                                        active={pagination.page === pageNum}
                                        onClick={() => pagination.onPageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </PaginationItem>
                                );
                            })}
                            <PaginationItem
                                next
                                disabled={pagination.page >= totalPages}
                                onClick={() => pagination.onPageChange(pagination.page + 1)}
                                aria-label="Next page"
                            />
                        </Pagination>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            {searchable && (
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            <Icon icon="search" height={16} width={16} />
                        </span>
                        <Input
                            ref={searchRef}
                            type="text"
                            placeholder={searchPlaceholder}
                            className="pl-10"
                            onInput={handleSearchInput}
                            onKeyUp={(e) => {
                                if ((e as KeyboardEvent).key === "Enter") handleSearch();
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Table Container */}
            <div ref={containerRef}>
                {renderTable()}
            </div>
        </div>
    );
}
