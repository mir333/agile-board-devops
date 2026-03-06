import type { RxJsonSchema } from "rxdb";

export interface DashboardItem {
  id: string;
  title: string;
  value: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export const dashboardItemSchema: RxJsonSchema<DashboardItem> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    title: {
      type: "string",
    },
    value: {
      type: "number",
    },
    category: {
      type: "string",
    },
    createdAt: {
      type: "string",
      format: "date-time",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
    },
  },
  required: ["id", "title", "value", "category", "createdAt", "updatedAt"],
};

export interface UserSettings {
  id: string;
  theme: "light" | "dark";
  language: string;
  azureDevOpsOrg: string;
  azureDevOpsPat: string;
  azureDevOpsQueryId: string;
  azureDevOpsQueryName: string;
  updatedAt: string;
}

export const userSettingsSchema: RxJsonSchema<UserSettings> = {
  version: 2,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    theme: {
      type: "string",
      enum: ["light", "dark"],
    },
    language: {
      type: "string",
    },
    azureDevOpsOrg: {
      type: "string",
    },
    azureDevOpsPat: {
      type: "string",
    },
    azureDevOpsQueryId: {
      type: "string",
    },
    azureDevOpsQueryName: {
      type: "string",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
    },
  },
  required: ["id", "theme", "language", "updatedAt"],
};
