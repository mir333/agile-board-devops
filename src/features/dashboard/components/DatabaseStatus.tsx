import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDatabase } from "@/root/hooks/useDatabase";

export function DatabaseStatus() {
  const { db, isLoading, error } = useDatabase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Local Storage</CardTitle>
        <CardDescription>RxDB Status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            {isLoading ? (
              <Badge variant="secondary">Connecting...</Badge>
            ) : error ? (
              <Badge variant="destructive">Error</Badge>
            ) : (
              <Badge className="bg-green-600 hover:bg-green-700">Connected</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Engine</span>
            <span className="text-sm font-medium">Dexie (IndexedDB)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Database</span>
            <span className="text-sm font-medium">{db ? db.name : "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Collections</span>
            <span className="text-sm font-medium">
              {db ? Object.keys(db.collections).length : "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
