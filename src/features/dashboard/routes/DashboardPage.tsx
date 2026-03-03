import { DatabaseStatus } from "../components/DatabaseStatus";
import { RecentActivity } from "../components/RecentActivity";
import { StatsOverview } from "../components/StatsOverview";

export function DashboardPage() {
  return (
    <>
      <StatsOverview />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <RecentActivity />
        <DatabaseStatus />
      </div>
    </>
  );
}
