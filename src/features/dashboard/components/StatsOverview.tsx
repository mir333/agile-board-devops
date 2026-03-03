import { StatsCard } from "@/components/StatsCard";

export function StatsOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Revenue"
        value="$45,231.89"
        description="from last month"
        icon="$"
        trend={{ value: "20.1%", positive: true }}
      />
      <StatsCard
        title="Subscriptions"
        value="+2,350"
        description="from last month"
        icon="👥"
        trend={{ value: "180.1%", positive: true }}
      />
      <StatsCard
        title="Sales"
        value="+12,234"
        description="from last month"
        icon="📊"
        trend={{ value: "19%", positive: true }}
      />
      <StatsCard
        title="Active Now"
        value="+573"
        description="since last hour"
        icon="⚡"
        trend={{ value: "201", positive: true }}
      />
    </div>
  );
}
