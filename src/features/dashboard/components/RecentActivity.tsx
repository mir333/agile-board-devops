import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ActivityItem {
  id: string;
  action: string;
  category: string;
  timestamp: string;
}

const mockActivities: ActivityItem[] = [
  { id: "1", action: "New user registered", category: "Users", timestamp: "2 min ago" },
  { id: "2", action: "Order #1234 completed", category: "Orders", timestamp: "15 min ago" },
  { id: "3", action: "Payment received - $250.00", category: "Revenue", timestamp: "1 hr ago" },
  { id: "4", action: "New product added", category: "Products", timestamp: "2 hrs ago" },
  { id: "5", action: "System backup completed", category: "System", timestamp: "3 hrs ago" },
];

export function RecentActivity() {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest actions across your dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity, index) => (
            <div key={activity.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm">{activity.action}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {activity.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                </div>
              </div>
              {index < mockActivities.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
