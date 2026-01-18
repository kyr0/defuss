import type { VNode } from "defuss";
import { Card, Icon } from "../../cl";

export interface StatCardProps {
    title: string;
    value: string | number;
    icon: string;
    change?: {
        value: number;
        trend: "up" | "down" | "neutral";
    };
    className?: string;
}

export const StatCard = ({
    title,
    value,
    icon,
    change,
    className = "",
}: StatCardProps) => {
    const trendColor =
        change?.trend === "up"
            ? "text-green-500"
            : change?.trend === "down"
                ? "text-red-500"
                : "text-muted-foreground";

    const trendIcon =
        change?.trend === "up"
            ? "trending-up"
            : change?.trend === "down"
                ? "trending-down"
                : "minus";

    return (
        <Card className={`${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {change && (
                        <div className={`flex items-center gap-1 mt-2 text-sm ${trendColor}`}>
                            <Icon icon={trendIcon} height={14} width={14} />
                            <span>
                                {change.value > 0 ? "+" : ""}
                                {change.value}%
                            </span>
                        </div>
                    )}
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Icon icon={icon} height={24} width={24} className="text-primary" />
                </div>
            </div>
        </Card>
    );
};
