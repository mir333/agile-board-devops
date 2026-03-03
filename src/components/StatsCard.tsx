import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-2xl">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <CardDescription className="flex items-center gap-1">
          {trend && (
            <span className={trend.positive ? "text-green-600" : "text-red-600"}>
              {trend.positive ? "+" : ""}
              {trend.value}
            </span>
          )}
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
