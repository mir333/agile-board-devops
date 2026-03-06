import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useDatabase } from "./useDatabase";

export interface SettingsState {
  theme: "light" | "dark";
  language: string;
  azureDevOpsOrg: string;
  azureDevOpsPat: string;
  azureDevOpsQueryId: string;
  azureDevOpsQueryName: string;
}

const defaultSettings: SettingsState = {
  theme: "light",
  language: "en",
  azureDevOpsOrg: "",
  azureDevOpsPat: "",
  azureDevOpsQueryId: "",
  azureDevOpsQueryName: "",
};

interface SettingsContextValue {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { db, isLoading: dbLoading } = useDatabase();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load settings from RxDB on mount / when db becomes available
  useEffect(() => {
    if (!db || hasLoaded) return;

    let cancelled = false;

    async function loadSettings() {
      try {
        const doc = await db!.user_settings.findOne("user-settings").exec();
        if (!cancelled && doc) {
          setSettings({
            theme: doc.theme,
            language: doc.language,
            azureDevOpsOrg: doc.azureDevOpsOrg ?? "",
            azureDevOpsPat: doc.azureDevOpsPat ?? "",
            azureDevOpsQueryId: doc.azureDevOpsQueryId ?? "",
            azureDevOpsQueryName: doc.azureDevOpsQueryName ?? "",
          });
        }
      } finally {
        if (!cancelled) {
          setHasLoaded(true);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [db, hasLoaded]);

  const updateSettings = useCallback(
    async (newSettings: Partial<SettingsState>) => {
      setIsSaving(true);
      try {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);

        if (db) {
          await db.user_settings.upsert({
            id: "user-settings",
            theme: updated.theme,
            language: updated.language,
            azureDevOpsOrg: updated.azureDevOpsOrg,
            azureDevOpsPat: updated.azureDevOpsPat,
            azureDevOpsQueryId: updated.azureDevOpsQueryId,
            azureDevOpsQueryName: updated.azureDevOpsQueryName,
            updatedAt: new Date().toISOString(),
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [db, settings],
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        isLoading: dbLoading || isSaving || !hasLoaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
