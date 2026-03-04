import type { Editor } from "@tldraw/editor";
import { useCallback } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import type { AzureWorkItem } from "../lib/azure-api";
import { CARD_HEIGHT, CARD_WIDTH, workItemToCardProps } from "../lib/work-item-shape";
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
