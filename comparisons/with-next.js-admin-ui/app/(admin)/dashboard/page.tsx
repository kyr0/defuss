import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { getDashboardData } from "@/lib/api-client";
import {
  Activity,
  Building2,
  KeyRound,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

function getActivityIcon(type: string) {
  switch (type) {
    case "login":
      return <Activity className="h-4 w-4" />;
    case "user_created":
      return <UserPlus className="h-4 w-4" />;
    case "tenant_created":
      return <Building2 className="h-4 w-4" />;
    case "api_key_created":
      return <KeyRound className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function formatTimeAgo(timestamp: string) {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default async function DashboardPage() {
  const { stats, activity } = await getDashboardData();
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening with your admin panel.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-5 w-5" />}
          change={{ value: 12, trend: "up" }}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={<Users className="h-5 w-5" />}
          change={{ value: 5, trend: "up" }}
        />
        <StatCard
          title="Total Tenants"
          value={stats.totalTenants}
          icon={<Building2 className="h-5 w-5" />}
          change={{ value: 2, trend: "up" }}
        />
        <StatCard
          title="API Keys"
          value={stats.totalApiKeys}
          icon={<KeyRound className="h-5 w-5" />}
          change={{ value: 0, trend: "neutral" }}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{item.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTimeAgo(item.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Button asChild variant="secondary" className="h-24 flex-col gap-2">
              <Link href="/users">
                <UserPlus className="h-5 w-5" />
                Add User
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-24 flex-col gap-2">
              <Link href="/tenants">
                <Building2 className="h-5 w-5" />
                Add Tenant
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-24 flex-col gap-2">
              <Link href="/api-keys">
                <KeyRound className="h-5 w-5" />
                Generate Key
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-24 flex-col gap-2">
              <Link href="/settings">
                <Settings className="h-5 w-5" />
                Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
