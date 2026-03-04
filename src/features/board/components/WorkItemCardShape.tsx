import { BaseBoxShapeUtil, HTMLContainer, T, type TLShape } from "tldraw";
import {
  WORK_ITEM_CARD_TYPE,
  WORK_ITEM_STATE_COLORS,
  WORK_ITEM_TYPE_COLORS,
} from "../lib/work-item-shape";

declare module "tldraw" {
  interface TLGlobalShapePropsMap {
    [WORK_ITEM_CARD_TYPE]: {
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
    };
  }
}

type WorkItemCardShape = TLShape<typeof WORK_ITEM_CARD_TYPE>;

export class WorkItemCardShapeUtil extends BaseBoxShapeUtil<WorkItemCardShape> {
  static override type = WORK_ITEM_CARD_TYPE;

  static override props = {
    w: T.number,
    h: T.number,
    workItemId: T.number,
    title: T.string,
    state: T.string,
    workItemType: T.string,
    assignedTo: T.string,
    priority: T.number,
    areaPath: T.string,
    azureUrl: T.string,
  };

  getDefaultProps(): WorkItemCardShape["props"] {
    return {
      w: 280,
      h: 140,
      workItemId: 0,
      title: "Work Item",
      state: "New",
      workItemType: "Task",
      assignedTo: "Unassigned",
      priority: 2,
      areaPath: "",
      azureUrl: "",
    };
  }

  component(shape: WorkItemCardShape) {
    const { workItemId, title, state, workItemType, assignedTo, priority } = shape.props;
    const typeColor = WORK_ITEM_TYPE_COLORS[workItemType] || "#6b7280";
    const stateColor = WORK_ITEM_STATE_COLORS[state] || "#6b7280";

    return (
      <HTMLContainer
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "all",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderLeft: `4px solid ${typeColor}`,
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                backgroundColor: typeColor,
                color: "#fff",
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "4px",
                textTransform: "uppercase",
              }}
            >
              {workItemType}
            </span>
            <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
              #{workItemId}
            </span>
            {priority > 0 && (
              <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: "auto" }}>
                P{priority}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#111827",
              lineHeight: "1.3",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "auto",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: stateColor,
                backgroundColor: `${stateColor}15`,
                padding: "2px 8px",
                borderRadius: "10px",
              }}
            >
              {state}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#6b7280",
                maxWidth: "120px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {assignedTo}
            </span>
          </div>
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: WorkItemCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={8} />;
  }
}
