import type { Editor } from "@tldraw/editor";
import { useCallback } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import type { AzureWorkItem } from "../lib/azure-api";
import { CARD_HEIGHT, CARD_WIDTH, WORK_ITEM_CARD_TYPE, workItemToCardProps } from "../lib/work-item-shape";
import { WorkItemCardShapeUtil } from "./WorkItemCardShape";

const customShapeUtils = [WorkItemCardShapeUtil];

interface BoardCanvasProps {
  onEditorMount?: (editor: Editor) => void;
}

export function BoardCanvas({ onEditorMount }: BoardCanvasProps) {
  const handleMount = useCallback(
    (editor: Editor) => {
      onEditorMount?.(editor);
    },
    [onEditorMount],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw shapeUtils={customShapeUtils} onMount={handleMount} persistenceKey="agile-board" />
    </div>
  );
}

/**
 * Places work items as card shapes on the canvas in a grid layout.
 */
export function placeWorkItemsOnCanvas(editor: Editor, items: AzureWorkItem[], orgUrl: string) {
  const columns = 4;
  const gapX = 20;
  const gapY = 20;
  const startX = 100;
  const startY = 100;

  const shapes = items.map((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    return {
      type: "work-item-card" as const,
      x: startX + col * (CARD_WIDTH + gapX),
      y: startY + row * (CARD_HEIGHT + gapY),
      props: workItemToCardProps(item, orgUrl),
    };
  });

  editor.createShapes(shapes);
}

/**
 * Syncs work items on the canvas by diffing existing shapes against incoming items.
 * - Updates existing cards with new data (preserving position)
 * - Creates new cards for items not yet on the canvas
 * - Deletes cards for items no longer in the incoming set
 */
export function syncWorkItemsOnCanvas(editor: Editor, items: AzureWorkItem[], orgUrl: string) {
  const columns = 4;
  const gapX = 20;
  const gapY = 20;
  const startX = 100;
  const startY = 100;

  // Build map of existing work item card shapes: workItemId -> shapeId
  const existingShapes = editor.getCurrentPageShapes();
  const existingMap = new Map<number, string>();
  for (const shape of existingShapes) {
    if (shape.type === WORK_ITEM_CARD_TYPE) {
      const props = shape.props as { workItemId: number };
      existingMap.set(props.workItemId, shape.id);
    }
  }

  // Build set of incoming work item IDs
  const incomingIds = new Set(items.map((item) => item.id));

  // UPDATE existing shapes & collect items to CREATE
  const toCreate: AzureWorkItem[] = [];
  for (const item of items) {
    const shapeId = existingMap.get(item.id);
    if (shapeId) {
      // Update existing shape (position unchanged)
      editor.updateShape({
        id: shapeId,
        type: WORK_ITEM_CARD_TYPE,
        props: workItemToCardProps(item, orgUrl),
      });
    } else {
      toCreate.push(item);
    }
  }

  // CREATE new shapes at grid positions
  if (toCreate.length > 0) {
    const shapes = toCreate.map((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        type: WORK_ITEM_CARD_TYPE,
        x: startX + col * (CARD_WIDTH + gapX),
        y: startY + row * (CARD_HEIGHT + gapY),
        props: workItemToCardProps(item, orgUrl),
      };
    });
    editor.createShapes(shapes);
  }

  // DELETE stale shapes
  const toDelete: string[] = [];
  for (const [workItemId, shapeId] of existingMap) {
    if (!incomingIds.has(workItemId)) {
      toDelete.push(shapeId);
    }
  }
  if (toDelete.length > 0) {
    editor.deleteShapes(toDelete);
  }
}
