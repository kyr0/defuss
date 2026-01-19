import type { Row } from "../benchmark-utils.js";

// Simple functional components for the benchmark table
// Uses defuss JSX factory

interface TableRowProps {
    row: Row;
    selected: boolean;
    onSelect: (id: number) => void;
    onRemove: (id: number) => void;
}

export const TableRow = ({ row, selected, onSelect, onRemove }: TableRowProps) => (
    <tr className={selected ? "danger" : ""}>
        <td className="col-md-1">{row.id}</td>
        <td className="col-md-4">
            <a onClick={() => onSelect(row.id)}>{row.label}</a>
        </td>
        <td className="col-md-1">
            <a onClick={() => onRemove(row.id)}>
                <span className="remove" aria-hidden="true">x</span>
            </a>
        </td>
        <td className="col-md-6" />
    </tr>
);

interface TableProps {
    rows: Row[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onRemove: (id: number) => void;
}

export const Table = ({ rows, selectedId, onSelect, onRemove }: TableProps) => (
    <div className="container">
        <div className="jumbotron">
            <div className="row">
                <div className="col-md-6">
                    <h1>Defuss Benchmark</h1>
                </div>
            </div>
        </div>
        <table className="table table-hover table-striped test-data">
            <tbody>
                {rows.map((row) => (
                    <TableRow
                        row={row}
                        selected={row.id === selectedId}
                        onSelect={onSelect}
                        onRemove={onRemove}
                    />
                ))}
            </tbody>
        </table>
        <span className="preloadicon glyphicon glyphicon-remove" aria-hidden="true" />
    </div>
);
