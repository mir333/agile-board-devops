import { createRxDatabase, type RxCollection, type RxDatabase } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import {
  type DashboardItem,
  dashboardItemSchema,
  type UserSettings,
  userSettingsSchema,
} from "./schema";

export type DatabaseCollections = {
  dashboard_items: RxCollection<DashboardItem>;
  user_settings: RxCollection<UserSettings>;
};

export type AppDatabase = RxDatabase<DatabaseCollections>;

let dbPromise: Promise<AppDatabase> | null = null;

export async function getDatabase(): Promise<AppDatabase> {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
}

async function createDatabase(): Promise<AppDatabase> {
  const db = await createRxDatabase<DatabaseCollections>({
    name: "dashboarddb",
    storage: getRxStorageDexie(),
    ignoreDuplicate: true,
  });

  await db.addCollections({
    dashboard_items: {
      schema: dashboardItemSchema,
    },
    user_settings: {
      schema: userSettingsSchema,
      migrationStrategies: {
        1: (oldDoc: any) => ({
          ...oldDoc,
          azureDevOpsOrg: "",
          azureDevOpsPat: "",
        }),
        2: (oldDoc: any) => ({
          ...oldDoc,
          azureDevOpsQueryId: "",
          azureDevOpsQueryName: "",
        }),
      },
    },
  });

  return db;
}

export async function destroyDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    await db.remove();
    dbPromise = null;
  }
}
