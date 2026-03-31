import { $, createRef, Router } from "defuss";
import type { RouteContext } from "defuss";
import { setHeaders } from "defuss-rpc/client.js";
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Skeleton,
	toast,
} from "defuss-shadcn";
import { getRpcClient } from "../lib/rpc-client.js";
import { AdminLayout } from "../layouts/admin.js";
import { t } from "../i18n";

interface DashboardData {
	stats: {
		totalUsers: number;
		activeUsers: number;
		totalTenants: number;
		totalApiKeys: number;
	};
	recentActivity: Array<{
		id: string;
		type: string;
		description: string;
		timestamp: string;
	}>;
}

const initialData: DashboardData = {
	stats: { totalUsers: 0, activeUsers: 0, totalTenants: 0, totalApiKeys: 0 },
	recentActivity: [],
};

/**
 * Dashboard screen showing stats cards, recent activity feed,
 * and quick-action navigation buttons.
 */
export function DashboardScreen({ route: _route }: { route?: RouteContext }) {
	const stateRef = createRef<HTMLElement, { data: DashboardData; loading: boolean }>(undefined, {
		data: initialData,
		loading: true,
	});
	const contentRef = createRef<HTMLDivElement>();

	const formatTimeAgo = (timestamp: string) => {
		const date = new Date(timestamp);
		const diffMs = Date.now() - date.getTime();
		const mins = Math.floor(diffMs / 60000);
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	};

	const loadDashboardData = async () => {
		try {
			const token = window.$APP_PROPS?.token;
			if (token) setHeaders({ Authorization: `Bearer ${token}` });

			const rpc = await getRpcClient();
			const dashboardApi = new rpc.DashboardApi();
			const [stats, recentActivity] = await Promise.all([
				dashboardApi.getStats(),
				dashboardApi.getRecentActivity(),
			]);

			stateRef.updateState({ data: { stats, recentActivity }, loading: false });
			$(contentRef).update(renderContent());
		} catch (error) {
			console.error("Failed to load dashboard data:", error);
			stateRef.updateState({ ...stateRef.state!, loading: false });
			toast({ category: "error", title: t("dashboard.load_failed") });
			$(contentRef).update(renderContent());
		}
	};

	const renderContent = () => {
		const state = stateRef.state!;
		if (state.loading) {
			return (
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
						{[1, 2, 3, 4].map((i) => (
							<Card key={i}>
								<CardHeader>
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-8 w-16 mt-1" />
								</CardHeader>
							</Card>
						))}
					</div>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						<Card>
							<CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
							<CardContent className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div key={i} className="border-b pb-2 last:border-0 space-y-1">
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-3 w-20" />
									</div>
								))}
							</CardContent>
						</Card>
						<Card>
							<CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
							<CardContent className="grid grid-cols-2 gap-3">
								{[1, 2, 3, 4].map((i) => (
									<Skeleton key={i} className="h-9 w-full rounded-md" />
								))}
							</CardContent>
						</Card>
					</div>
				</div>
			);
		}

		const { stats, recentActivity } = state.data;

		return (
			<div className="space-y-6">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader><CardDescription>{t("dashboard.total_users")}</CardDescription><CardTitle>{stats.totalUsers}</CardTitle></CardHeader>
					</Card>
					<Card>
						<CardHeader><CardDescription>{t("dashboard.active_users")}</CardDescription><CardTitle>{stats.activeUsers}</CardTitle></CardHeader>
					</Card>
					<Card>
						<CardHeader><CardDescription>{t("dashboard.total_tenants")}</CardDescription><CardTitle>{stats.totalTenants}</CardTitle></CardHeader>
					</Card>
					<Card>
						<CardHeader><CardDescription>{t("dashboard.api_keys")}</CardDescription><CardTitle>{stats.totalApiKeys}</CardTitle></CardHeader>
					</Card>
				</div>

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>{t("dashboard.recent_activity")}</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{recentActivity.map((activity) => (
								<div key={activity.id} className="border-b pb-2 last:border-0">
									<p className="text-sm">{activity.description}</p>
									<p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>{t("dashboard.quick_actions")}</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-3">
							<Button variant="secondary" onClick={() => Router.navigate("/users")}>{t("dashboard.add_user")}</Button>
							<Button variant="secondary" onClick={() => Router.navigate("/tenants")}>{t("dashboard.add_tenant")}</Button>
							<Button variant="secondary" onClick={() => Router.navigate("/api-keys")}>{t("dashboard.generate_key")}</Button>
							<Button variant="outline" onClick={() => Router.navigate("/dashboard")}>{t("dashboard.refresh")}</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	};

	return (
		<AdminLayout>
			<div className="max-w-7xl mx-auto overflow-hidden h-screen" onMount={() => loadDashboardData()}>
				<div className="mb-8">
					<h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
					<p className="text-muted-foreground mt-2">{t("dashboard.subtitle")}</p>
				</div>
				<div ref={contentRef}>{renderContent()}</div>
			</div>
		</AdminLayout>
	);
}
