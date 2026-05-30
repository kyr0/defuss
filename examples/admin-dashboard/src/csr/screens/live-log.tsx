import type { FC, RouteProps } from "defuss";
import { $, createRef, createStore } from "defuss";
import { createDataview, applyDataview } from "defuss-dataview";
import type { DataviewState } from "defuss-dataview";
import { DataTable, Badge } from "defuss-shadcn";
import type { DataTableColumn } from "defuss-shadcn";
import { AdminLayout } from "../layouts/admin";
import { NavGuard } from "../components/nav-guard";
import { t } from "../i18n";

// -- Types ------------------------------------------------------------------

export interface LogEntry {
	[key: string]: unknown;
	id: string;
	timestamp: string;
	level: "info" | "warn" | "error" | "debug";
	source: string;
	message: string;
}

// -- Log generator ----------------------------------------------------------

let logCounter = 0;
const sources = ["auth", "api", "worker", "db", "cache", "scheduler", "gateway"];
const levels: LogEntry["level"][] = ["info", "info", "info", "warn", "error", "debug"];
const messages: Record<string, string[]> = {
	auth: [
		"User login successful",
		"Token refreshed",
		"Session expired for user",
		"Failed login attempt from unknown IP",
		"OAuth2 callback received",
		"Password reset requested",
	],
	api: [
		"GET /api/users 200 OK (23ms)",
		"POST /api/tenants 201 Created (45ms)",
		"GET /api/dashboard 200 OK (12ms)",
		"PUT /api/users/42 400 Bad Request (8ms)",
		"DELETE /api/keys/7 204 No Content (15ms)",
		"Rate limit exceeded for client",
	],
	worker: [
		"Background job completed: email-send",
		"Processing batch #4821",
		"Worker pool scaled to 4 instances",
		"Job retry #2: invoice-generate",
		"Queue depth: 12 pending tasks",
		"Dead letter queue: 1 message moved",
	],
	db: [
		"Query executed in 3ms: SELECT users",
		"Connection pool: 8/20 active",
		"Slow query detected (>500ms): aggregation",
		"Migration #47 applied successfully",
		"Replication lag: 120ms",
		"Vacuum completed for table events",
	],
	cache: [
		"Cache hit: user:42 (TTL 290s remaining)",
		"Cache miss: tenant:9 — fetching from DB",
		"Evicted 150 stale entries",
		"Memory usage: 64MB / 256MB (25%)",
		"Cache warmed: 2400 keys loaded",
		"Redis reconnected after 2s downtime",
	],
	scheduler: [
		"Cron triggered: daily-report",
		"Scheduled task skipped (already running)",
		"Next run: cleanup-logs at 03:00 UTC",
		"Health check passed — all services up",
		"Heartbeat sent to monitoring",
		"Retry policy applied: exponential backoff",
	],
	gateway: [
		"Incoming request routed to service-a",
		"TLS certificate renewal in 14 days",
		"Circuit breaker opened for service-b",
		"Request timeout: upstream did not respond",
		"Load balance: round-robin to node-3",
		"WebSocket connection established",
	],
};

function generateLogEntry(): LogEntry {
	logCounter++;
	const source = sources[Math.floor(Math.random() * sources.length)];
	const level = levels[Math.floor(Math.random() * levels.length)];
	const pool = messages[source];
	const message = pool[Math.floor(Math.random() * pool.length)];
	const now = new Date();
	const timestamp = now.toISOString().replace("T", " ").slice(0, 19);

	return {
		id: `LOG-${String(logCounter).padStart(5, "0")}`,
		timestamp,
		level,
		source,
		message,
	};
}

function generateInitialLogs(count: number): LogEntry[] {
	const logs: LogEntry[] = [];
	for (let i = 0; i < count; i++) logs.push(generateLogEntry());
	return logs;
}

// -- Columns ----------------------------------------------------------------

const levelVariant: Record<LogEntry["level"], string> = {
	info: "default",
	warn: "warning",
	error: "destructive",
	debug: "secondary",
};

const logColumns: DataTableColumn[] = [
	{ field: "id", label: "ID", sortable: true, className: "font-mono text-xs w-28" },
	{ field: "timestamp", label: "Timestamp", sortable: true, className: "font-mono text-xs w-44" },
	{
		field: "level",
		label: "Level",
		sortable: true,
		className: "w-24",
		render: (value) => (
			<Badge variant={(levelVariant[value as LogEntry["level"]] ?? "secondary") as "default"}>
				{String(value).toUpperCase()}
			</Badge>
		),
	},
	{ field: "source", label: "Source", sortable: true, className: "w-28" },
	{ field: "message", label: "Message", sortable: true },
];

// -- State ------------------------------------------------------------------

export interface LiveLogState {
	view: DataviewState;
	data: LogEntry[];
	levelFilter: string;
	searchQuery: string;
	paused: boolean;
}

const liveLogStore = createStore<LiveLogState>({
	view: createDataview({
		sorters: [{ field: "id", direction: "desc" }],
		page: 0,
		pageSize: 10,
	}),
	data: generateInitialLogs(25),
	levelFilter: "all",
	searchQuery: "",
	paused: false,
});

// -- Handlers (module-level) ------------------------------------------------

const handleSort = (field: string) => {
	const { view } = liveLogStore.value;
	const dir =
		view.sorters[0]?.field === field && view.sorters[0].direction === "asc"
			? "desc"
			: "asc";
	liveLogStore.set({
		...liveLogStore.value,
		view: createDataview({ ...view, sorters: [{ field, direction: dir }], page: 0 }),
	});
};

const handlePageChange = (page: number) => {
	const { view } = liveLogStore.value;
	liveLogStore.set({
		...liveLogStore.value,
		view: createDataview({ ...view, page }),
	});
};

const handlePageSizeChange = (e: Event) => {
	const newSize = Number((e.target as HTMLSelectElement).value);
	const { view } = liveLogStore.value;
	liveLogStore.set({
		...liveLogStore.value,
		view: createDataview({ ...view, pageSize: newSize, page: 0 }),
	});
};

const handleSearchChange = (e: Event) => {
	const value = (e.target as HTMLInputElement).value;
	const { view } = liveLogStore.value;
	liveLogStore.set({
		...liveLogStore.value,
		searchQuery: value,
		view: createDataview({ ...view, page: 0 }),
	});
};

const handleLevelChange = (e: Event) => {
	const value = (e.target as HTMLSelectElement).value;
	const { view } = liveLogStore.value;
	liveLogStore.set({
		...liveLogStore.value,
		levelFilter: value,
		view: createDataview({ ...view, page: 0 }),
	});
};

const togglePause = () => {
	liveLogStore.set({
		...liveLogStore.value,
		paused: !liveLogStore.value.paused,
	});
};

// -- Content renderer -------------------------------------------------------

const LiveLogContent: FC = () => {
	const { view, data, levelFilter, searchQuery, paused } = liveLogStore.value;

	// Text search across id, source, message
	const searchLower = searchQuery.toLowerCase();
	const searched = (searchQuery
		? data.filter(
			(row) =>
				row.id.toLowerCase().includes(searchLower) ||
				row.source.toLowerCase().includes(searchLower) ||
				row.message.toLowerCase().includes(searchLower),
		)
		: data) as LogEntry[];

	// Build dataview filters for level
	const filters: Array<{ field: string; op: "eq"; value: string }> = [];
	if (levelFilter !== "all") {
		filters.push({ field: "level", op: "eq", value: levelFilter });
	}

	// Compute pagination first so we can clamp page safely under live updates.
	const allFiltered = applyDataview(
		searched,
		createDataview({ ...view, filters, page: undefined, pageSize: undefined }),
	);
	const totalFiltered = allFiltered.length;
	const pageSize = Math.max(1, view.pageSize ?? 10);
	const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
	const currentPage = Math.min(view.page, totalPages - 1);
	const effectiveView = createDataview({ ...view, filters, page: currentPage, pageSize });
	const entries = applyDataview(searched, effectiveView);
	const startIndex = currentPage * pageSize;

	return (
		<div class="space-y-4">
			{/* Toolbar */}
			<div class="flex flex-col sm:flex-row gap-4">
				<input
					type="text"
					placeholder={t("liveLog.search_placeholder")}
					class="input flex-1"
					value={searchQuery}
					onInput={handleSearchChange}
				/>
				<select
					class="select w-full sm:w-40"
					value={levelFilter}
					onChange={handleLevelChange}
				>
					<option value="all">{t("liveLog.all_levels")}</option>
					<option value="info">INFO</option>
					<option value="warn">WARN</option>
					<option value="error">ERROR</option>
					<option value="debug">DEBUG</option>
				</select>
				<button
					type="button"
					class={`btn ${paused ? "btn-outline" : "btn-primary"} w-full sm:w-32`}
					onClick={togglePause}
				>
					{paused ? t("liveLog.resume") : t("liveLog.pause")}
				</button>
			</div>

			{/* Status bar */}
			<div class="flex items-center gap-3 text-sm text-muted-foreground">
				<span class={`inline-block w-2 h-2 rounded-full ${paused ? "bg-yellow-500" : "bg-green-500 animate-pulse"}`} />
				<span>{paused ? t("liveLog.status_paused") : t("liveLog.status_live")}</span>
				<span class="ml-auto">{t("liveLog.total_entries")}: {data.length}</span>
			</div>

			{/* DataTable */}
			<DataTable
				entries={entries}
				columns={logColumns}
				sortField={effectiveView.sorters[0]?.field}
				sortDirection={effectiveView.sorters[0]?.direction}
				onSort={handleSort}
			/>

			{/* Pagination */}
			<div class="flex items-center justify-between px-2">
				<div class="flex items-center gap-4">
					<span class="text-sm text-muted-foreground">
						{t("liveLog.showing")} {Math.min(startIndex + 1, totalFiltered)}–
						{Math.min(startIndex + pageSize, totalFiltered)} {t("liveLog.of")} {totalFiltered}
					</span>
					<div class="flex items-center gap-2">
						<span class="text-sm text-muted-foreground">{t("liveLog.rows_per_page")}:</span>
						<select
							key={`pagesize-${pageSize}`}
							class="select w-20"
							value={String(pageSize)}
							onChange={handlePageSizeChange}
						>
							<option value="5">5</option>
							<option value="10">10</option>
							<option value="20">20</option>
							<option value="50">50</option>
						</select>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="btn btn-sm btn-outline"
						onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
						disabled={currentPage === 0}
					>
						{t("liveLog.previous")}
					</button>
					<span class="text-sm text-muted-foreground">
						{t("liveLog.page")} {currentPage + 1} / {totalPages}
					</span>
					<button
						type="button"
						class="btn btn-sm btn-outline"
						onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
						disabled={currentPage >= totalPages - 1}
					>
						{t("liveLog.next")}
					</button>
				</div>
			</div>
		</div>
	);
};

// -- Screen -----------------------------------------------------------------

export function LiveLogScreen({ route }: RouteProps) {
	const contentRef = createRef<HTMLDivElement>();
	let intervalId: ReturnType<typeof setInterval> | undefined;
	let unsubscribe: (() => void) | undefined;
	let isActive = false;

	const isLiveLogRoute = () => {
		if (typeof window === "undefined") return false;
		const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
		return normalizedPath === "/live-log";
	};

	const rerender = () => {
		if (!isActive || !contentRef.current || !isLiveLogRoute()) {
			stopLiveUpdates();
			return;
		}
		$(contentRef).update(<LiveLogContent />);
	};

	const stopLiveUpdates = () => {
		isActive = false;
		if (unsubscribe) {
			unsubscribe();
			unsubscribe = undefined;
		}
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = undefined;
		}
	};

	const startLiveUpdates = () => {
		stopLiveUpdates();
		if (!isLiveLogRoute()) return;

		isActive = true;
		unsubscribe = liveLogStore.subscribe(() => rerender());

		intervalId = setInterval(() => {
			if (!isActive || !isLiveLogRoute()) {
				stopLiveUpdates();
				return;
			}
			const state = liveLogStore.value;
			if (state.paused) return;

			// Add 1-3 new log entries per tick
			const count = 1 + Math.floor(Math.random() * 3);
			const newEntries: LogEntry[] = [];
			for (let i = 0; i < count; i++) newEntries.push(generateLogEntry());

			// Cap at 500 entries to prevent unbounded growth
			const combined = [...state.data, ...newEntries];
			const capped = combined.length > 500 ? combined.slice(combined.length - 500) : combined;

			liveLogStore.set({ ...state, data: capped });
		}, 1000);
	};

	const handleMount = () => {
		startLiveUpdates();
	};

	const handleUnmount = () => {
		stopLiveUpdates();
	};

	return (
		<AdminLayout onMount={handleMount} onUnmount={handleUnmount}>
			{route && <NavGuard route={route} />}
			<div class="max-w-7xl mx-auto">
				<div class="flex items-center justify-between mb-8">
					<div>
						<h1 class="text-3xl font-bold">{t("liveLog.title")}</h1>
						<p class="text-muted-foreground mt-1">{t("liveLog.subtitle")}</p>
					</div>
				</div>
				<div ref={contentRef}>
					<LiveLogContent />
				</div>
			</div>
		</AdminLayout>
	);
}
