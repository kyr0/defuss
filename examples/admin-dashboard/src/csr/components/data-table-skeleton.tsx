import type { FC } from "defuss";
import { Skeleton } from "defuss-shadcn";

interface DataTableSkeletonProps {
	/** Number of columns to render. Default 5. */
	columns?: number;
	/** Number of skeleton rows. Default 5. */
	rows?: number;
}

/** Skeleton placeholder mimicking a DataTable with header + body rows. */
export const DataTableSkeleton: FC<DataTableSkeletonProps> = ({ columns = 5, rows = 5 }) => {
	const colArray = Array.from({ length: columns }, (_, i) => i);
	const rowArray = Array.from({ length: rows }, (_, i) => i);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Skeleton className="h-9 w-64 rounded-md" />
				<Skeleton className="h-9 w-28 rounded-md" />
			</div>
			<div className="rounded-md border">
				<div className="border-b">
					<div className="flex gap-4 p-3">
						{colArray.map((c) => (
							<Skeleton key={`h-${c}`} className="h-4 flex-1" />
						))}
					</div>
				</div>
				{rowArray.map((r) => (
					<div key={`r-${r}`} className="flex gap-4 p-3 border-b last:border-0">
						{colArray.map((c) => (
							<Skeleton key={`r-${r}-c-${c}`} className="h-4 flex-1" />
						))}
					</div>
				))}
			</div>
		</div>
	);
};
