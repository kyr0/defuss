import { createRef, type Props, type Ref, type VNode } from "defuss";

/** Example usage:

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John Doe</TableCell>
      <TableCell>john@example.com</TableCell>
      <TableCell><Badge>Active</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>

*/

export interface TableProps extends Props {
    className?: string;
    ref?: Ref;
    divider?: boolean;
    striped?: boolean;
    hover?: boolean;
    small?: boolean;
    justify?: boolean;
    middle?: boolean;
    responsive?: boolean;
    children?: VNode | VNode[];
    [key: string]: any;
}

export const Table = ({
    className = "",
    ref = createRef(),
    divider = true,
    striped = false,
    hover = true,
    small = false,
    justify = false,
    middle = false,
    responsive = true,
    children,
    ...props
}: TableProps) => {
    const classes = [
        "uk-table",
        divider && "uk-table-divider",
        striped && "uk-table-striped",
        hover && "uk-table-hover",
        small && "uk-table-sm",
        justify && "uk-table-justify",
        middle && "uk-table-middle",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    const table = (
        <table ref={ref} className={classes} {...props}>
            {children}
        </table>
    );

    if (responsive) {
        return <div className="uk-overflow-auto">{table}</div>;
    }

    return table;
};

// Table Header
export interface TableHeaderProps extends Props {
    className?: string;
    children?: VNode | VNode[];
    [key: string]: any;
}

export const TableHeader = ({
    className = "",
    children,
    ...props
}: TableHeaderProps) => (
    <thead className={className} {...props}>
        {children}
    </thead>
);

// Table Body
export interface TableBodyProps extends Props {
    className?: string;
    children?: VNode | VNode[];
    [key: string]: any;
}

export const TableBody = ({
    className = "",
    children,
    ...props
}: TableBodyProps) => (
    <tbody className={className} {...props}>
        {children}
    </tbody>
);

// Table Footer
export interface TableFooterProps extends Props {
    className?: string;
    children?: VNode | VNode[];
    [key: string]: any;
}

export const TableFooter = ({
    className = "",
    children,
    ...props
}: TableFooterProps) => (
    <tfoot className={className} {...props}>
        {children}
    </tfoot>
);

// Table Row
export interface TableRowProps extends Props {
    className?: string;
    active?: boolean;
    children?: VNode | VNode[];
    [key: string]: any;
}

export const TableRow = ({
    className = "",
    active = false,
    children,
    ...props
}: TableRowProps) => (
    <tr
        className={[active && "uk-active", className].filter(Boolean).join(" ")}
        {...props}
    >
        {children}
    </tr>
);

// Table Head Cell
export interface TableHeadProps extends Props {
    className?: string;
    shrink?: boolean;
    expand?: boolean;
    width?: "small" | "medium" | "large";
    children?: VNode | VNode[] | string | number;
    [key: string]: any;
}

export const TableHead = ({
    className = "",
    shrink = false,
    expand = false,
    width,
    children,
    ...props
}: TableHeadProps) => (
    <th
        className={[
            shrink && "uk-table-shrink",
            expand && "uk-table-expand",
            width && `uk-table-${width}`,
            className,
        ]
            .filter(Boolean)
            .join(" ")}
        {...props}
    >
        {children}
    </th>
);

// Table Cell
export interface TableCellProps extends Props {
    className?: string;
    link?: boolean;
    truncate?: boolean;
    children?: VNode | VNode[] | string | number;
    [key: string]: any;
}

export const TableCell = ({
    className = "",
    link = false,
    truncate = false,
    children,
    ...props
}: TableCellProps) => (
    <td
        className={[
            link && "uk-table-link",
            truncate && "uk-text-truncate",
            className,
        ]
            .filter(Boolean)
            .join(" ")}
        {...props}
    >
        {children}
    </td>
);
