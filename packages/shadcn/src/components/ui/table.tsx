import type { ElementProps, FC } from "defuss";
import { cn } from "../../utilities/cn.js";

export type TableProps = ElementProps<HTMLTableElement>;
export type TableHeaderProps = ElementProps<HTMLTableSectionElement>;
export type TableBodyProps = ElementProps<HTMLTableSectionElement>;
export type TableFooterProps = ElementProps<HTMLTableSectionElement>;
export type TableRowProps = ElementProps<HTMLTableRowElement>;
export type TableHeadProps = ElementProps<HTMLTableCellElement>;
export type TableCellProps = ElementProps<HTMLTableCellElement>;
export type TableCaptionProps = ElementProps<HTMLTableCaptionElement>;

export const Table: FC<TableProps> = ({ className, children, ...props }) => {
    return (
        <div class="table-container">
            <table
                class={cn("table", className)}
                {...props}
            >
                {children}
            </table>
        </div>
    );
};

export const TableHeader: FC<TableHeaderProps> = ({ className, children, ...props }) => {
    return (
        <thead
            class={cn("table-header", className)}
            {...props}
        >
            {children}
        </thead>
    );
};

export const TableBody: FC<TableBodyProps> = ({ className, children, ...props }) => {
    return (
        <tbody
            class={cn("table-body", className)}
            {...props}
        >
            {children}
        </tbody>
    );
};

export const TableFooter: FC<TableFooterProps> = ({ className, children, ...props }) => {
    return (
        <tfoot
            class={cn("table-footer", className)}
            {...props}
        >
            {children}
        </tfoot>
    );
};

export const TableRow: FC<TableRowProps> = ({ className, children, ...props }) => {
    return (
        <tr
            class={cn("table-row", className)}
            {...props}
        >
            {children}
        </tr>
    );
};

export const TableHead: FC<TableHeadProps> = ({ className, children, ...props }) => {
    return (
        <th
            class={cn("table-head", className)}
            {...props}
        >
            {children}
        </th>
    );
};

export const TableCell: FC<TableCellProps> = ({ className, children, ...props }) => {
    return (
        <td
            class={cn("table-cell", className)}
            {...props}
        >
            {children}
        </td>
    );
};

export const TableCaption: FC<TableCaptionProps> = ({ className, children, ...props }) => {
    return (
        <caption
            class={cn("table-caption", className)}
            {...props}
        >
            {children}
        </caption>
    );
};
