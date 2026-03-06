import { Loader2, PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { SavedQuery } from "../lib/azure-api";

interface QueryPanelProps {
  queries: SavedQuery[];
  selectedQueryId: string;
  onQueryChange: (queryId: string) => void;
  onSync: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  lastSynced: Date | null;
}

export function QueryPanel({
  queries,
  selectedQueryId,
  onQueryChange,
  onSync,
  isLoading,
  isOpen,
  onToggle,
  lastSynced,
}: QueryPanelProps) {
  if (!isOpen) {
    return (
      <div className="absolute left-3 top-3 z-50">
        <Button variant="secondary" size="icon" onClick={onToggle} title="Open query panel">
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Group queries by folder
  const grouped = new Map<string, SavedQuery[]>();
  for (const query of queries) {
    const folder = query.folder || "Other";
    if (!grouped.has(folder)) {
      grouped.set(folder, []);
    }
    grouped.get(folder)!.push(query);
  }

  return (
    <div className="absolute left-3 top-3 bottom-3 z-50 w-72 rounded-lg border bg-card shadow-lg overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Saved Query</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-medium">Query</Label>
          <Select value={selectedQueryId} onValueChange={onQueryChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a saved query" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(grouped.entries()).map(([folder, folderQueries]) => (
                <SelectGroup key={folder}>
                  <SelectLabel>{folder}</SelectLabel>
                  {folderQueries.map((query) => (
                    <SelectItem key={query.id} value={query.id}>
                      {query.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <Button className="w-full" onClick={onSync} disabled={!selectedQueryId || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            "Sync"
          )}
        </Button>

        {lastSynced && (
          <p className="text-xs text-muted-foreground text-center">
            Last synced: {lastSynced.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
