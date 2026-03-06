import { describe, expect, it, vi } from "vitest";
import type { AzureWorkItem } from "../../lib/azure-api";
import { WORK_ITEM_CARD_TYPE } from "../../lib/work-item-shape";
import { syncWorkItemsOnCanvas } from "../BoardCanvas";

function makeWorkItem(id: number, title: string, state: string): AzureWorkItem {
  return {
    id,
    fields: {
      "System.Title": title,
      "System.State": state,
      "System.WorkItemType": "Task",
      "System.AssignedTo": "Dev",
      "System.AreaPath": "Project",
      "Microsoft.VSTS.Common.Priority": 2,
    },
    url: `https://dev.azure.com/_apis/wit/workItems/${id}`,
  };
}

function makeMockEditor(
  existingShapes: Array<{ id: string; type: string; props: { workItemId: number } }>,
) {
  return {
    getCurrentPageShapes: vi.fn(() => existingShapes),
    updateShape: vi.fn(),
    createShapes: vi.fn(),
    deleteShapes: vi.fn(),
  };
}

describe("syncWorkItemsOnCanvas", () => {
  const orgUrl = "https://dev.azure.com/test-org";

  it("creates shapes when canvas is empty", () => {
    const editor = makeMockEditor([]);
    const items = [makeWorkItem(1, "Task 1", "Active"), makeWorkItem(2, "Task 2", "New")];
    syncWorkItemsOnCanvas(editor as any, items, orgUrl);
    expect(editor.createShapes).toHaveBeenCalledTimes(1);
    const createdShapes = editor.createShapes.mock.calls[0][0];
    expect(createdShapes).toHaveLength(2);
    expect(createdShapes[0].props.workItemId).toBe(1);
    expect(createdShapes[1].props.workItemId).toBe(2);
    expect(editor.updateShape).not.toHaveBeenCalled();
    expect(editor.deleteShapes).not.toHaveBeenCalled();
  });

  it("updates existing shapes without changing position", () => {
    const editor = makeMockEditor([
      { id: "shape-a", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 1 } },
    ]);
    const items = [makeWorkItem(1, "Updated Title", "Resolved")];
    syncWorkItemsOnCanvas(editor as any, items, orgUrl);
    expect(editor.updateShape).toHaveBeenCalledTimes(1);
    expect(editor.updateShape).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "shape-a",
        type: WORK_ITEM_CARD_TYPE,
        props: expect.objectContaining({ title: "Updated Title", state: "Resolved" }),
      }),
    );
    expect(editor.createShapes).not.toHaveBeenCalled();
    expect(editor.deleteShapes).not.toHaveBeenCalled();
  });

  it("deletes shapes not present in incoming items", () => {
    const editor = makeMockEditor([
      { id: "shape-a", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 1 } },
      { id: "shape-b", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 99 } },
    ]);
    const items = [makeWorkItem(1, "Task 1", "Active")];
    syncWorkItemsOnCanvas(editor as any, items, orgUrl);
    expect(editor.deleteShapes).toHaveBeenCalledWith(["shape-b"]);
  });

  it("handles mixed create/update/delete in one sync", () => {
    const editor = makeMockEditor([
      { id: "shape-a", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 1 } },
      { id: "shape-b", type: WORK_ITEM_CARD_TYPE, props: { workItemId: 2 } },
    ]);
    const items = [makeWorkItem(1, "Updated", "Active"), makeWorkItem(3, "Brand New", "New")];
    syncWorkItemsOnCanvas(editor as any, items, orgUrl);
    expect(editor.updateShape).toHaveBeenCalledTimes(1);
    expect(editor.updateShape).toHaveBeenCalledWith(expect.objectContaining({ id: "shape-a" }));
    expect(editor.deleteShapes).toHaveBeenCalledWith(["shape-b"]);
    expect(editor.createShapes).toHaveBeenCalledTimes(1);
    const created = editor.createShapes.mock.calls[0][0];
    expect(created).toHaveLength(1);
    expect(created[0].props.workItemId).toBe(3);
  });
});
