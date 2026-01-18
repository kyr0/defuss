import { createRef, $, Router } from "defuss";
import { Card, Icon, Button } from "../../cl";
import { StatCard } from "../components/stat-card";
import { AdminLayout } from "../layouts/admin";
import { getRpcClient, setHeaders } from "defuss-rpc/client.js";
import type { RpcApi } from "../../rpc.js";

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

export function DashboardScreen() {
  const dataRef = createRef<DashboardData>(undefined, {
    stats: { totalUsers: 0, activeUsers: 0, totalTenants: 0, totalApiKeys: 0 },
    recentActivity: [],
  });
  const containerRef = createRef();
  const loadingRef = createRef<{ loading: boolean }>(undefined, { loading: true });

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login":
        return "log-in";
      case "user_created":
        return "user-plus";
      case "tenant_created":
        return "building-2";
      case "api_key_created":
        return "key";
      default:
        return "activity";
    }
  };

  const loadDashboardData = async () => {
    try {
      // Set auth header from session
      const token = window.$APP_PROPS?.token;
      if (token) {
        setHeaders({ Authorization: `Bearer ${token}` });
      }

      const rpc = await getRpcClient<RpcApi>();
      const dashboardApi = new rpc.DashboardApi();

      const [stats, recentActivity] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecentActivity(),
      ]);

      dataRef.updateState({ stats, recentActivity });
      loadingRef.updateState({ loading: false });

      // Re-render the content
      $(containerRef).update(renderContent());
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      loadingRef.updateState({ loading: false });
    }
  };

  const renderContent = () => {
    const data = dataRef.state!;
    const loading = loadingRef.state?.loading ?? true;

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <span className="uk-spinner" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={data.stats.totalUsers}
            icon="users"
            change={{ value: 12, trend: "up" }}
          />
          <StatCard
            title="Active Users"
            value={data.stats.activeUsers}
            icon="user-check"
            change={{ value: 5, trend: "up" }}
          />
          <StatCard
            title="Total Tenants"
            value={data.stats.totalTenants}
            icon="building-2"
            change={{ value: 2, trend: "up" }}
          />
          <StatCard
            title="API Keys"
            value={data.stats.totalApiKeys}
            icon="key"
            change={{ value: 0, trend: "neutral" }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card title="Recent Activity" className="lg:col-span-1">
            <div className="space-y-4 m-6">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon icon={getActivityIcon(activity.type)} height={16} width={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions" className="lg:col-span-1">
            <div className="grid grid-cols-2 gap-4 m-6">
              <Button
                type="secondary"
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => Router.navigate("/users")}
              >
                <Icon icon="user-plus" height={24} width={24} />
                <span>Add User</span>
              </Button>
              <Button
                type="secondary"
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => Router.navigate("/tenants")}
              >
                <Icon icon="building-2" height={24} width={24} />
                <span>Add Tenant</span>
              </Button>
              <Button
                type="secondary"
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => Router.navigate("/api-keys")}
              >
                <Icon icon="key" height={24} width={24} />
                <span>Generate Key</span>
              </Button>
              <Button
                type="secondary"
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => Router.navigate("/settings")}
              >
                <Icon icon="settings" height={24} width={24} />
                <span>Settings</span>
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto" onMount={() => loadDashboardData()}>
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your admin panel.
          </p>
        </div>

        {/* Dynamic Content */}
        <div ref={containerRef}>
          {renderContent()}
        </div>
      </div>
    </AdminLayout>
  );
}
