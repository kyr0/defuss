import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  change?: {
    value: number;
    trend: "up" | "down" | "neutral";
  };
}

export function StatCard({ title, value, icon, change }: StatCardProps) {
  const trend = change?.trend ?? "neutral";
  const isUp = trend === "up";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {change ? (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className={cn(
                  "flex items-center gap-1 font-medium",
                  isUp && "text-emerald-500",
                  trend === "down" && "text-rose-500"
                )}
              >
                {isUp ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {change.value}%
              </span>
              vs last week
            </div>
          ) : null}
        </div>
        <div className="rounded-xl bg-muted p-3 text-muted-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
