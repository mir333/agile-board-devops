import type { AzureWorkItem } from "./azure-api";

export const WORK_ITEM_CARD_TYPE = "work-item-card" as const;

export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 140;

export interface WorkItemCardProps {
  w: number;
  h: number;
  workItemId: number;
  title: string;
  state: string;
  workItemType: string;
  assignedTo: string;
  priority: number;
  areaPath: string;
  azureUrl: string;
}

export const WORK_ITEM_TYPE_COLORS: Record<string, string> = {
  Bug: "#dc2626",
  "User Story": "#2563eb",
  Task: "#ca8a04",
  Epic: "#9333ea",
  Feature: "#059669",
};

export const WORK_ITEM_STATE_COLORS: Record<string, string> = {
  New: "#6b7280",
  Active: "#2563eb",
  Resolved: "#059669",
  Closed: "#9333ea",
  Removed: "#dc2626",
};

export function workItemToCardProps(item: AzureWorkItem, orgUrl: string): WorkItemCardProps {
  const fields = item.fields;
  const assignedTo = fields["System.AssignedTo"] as { displayName?: string } | string | undefined;

  return {
    w: CARD_WIDTH,
    h: CARD_HEIGHT,
    workItemId: item.id,
    title: (fields["System.Title"] as string) || "Untitled",
    state: (fields["System.State"] as string) || "Unknown",
    workItemType: (fields["System.WorkItemType"] as string) || "Unknown",
    assignedTo:
      typeof assignedTo === "object"
        ? assignedTo?.displayName || "Unassigned"
        : (assignedTo as string) || "Unassigned",
    priority: (fields["Microsoft.VSTS.Common.Priority"] as number) || 0,
    areaPath: (fields["System.AreaPath"] as string) || "",
    azureUrl: `${orgUrl}/_workitems/edit/${item.id}`,
  };
}
