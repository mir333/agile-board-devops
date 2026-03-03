import { useCallback, useState } from "react";
import { useDatabase } from "@/root/hooks/useDatabase";

export interface SettingsState {
  theme: "light" | "dark";
  language: string;
}

const defaultSettings: SettingsState = {
  theme: "light",
  language: "en",
};

export function useSettings() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);

  const updateSettings = useCallback(
    async (newSettings: Partial<SettingsState>) => {
      setIsLoading(true);
      try {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);

        if (db) {
          await db.user_settings.upsert({
            id: "user-settings",
            theme: updated.theme,
            language: updated.language,
            updatedAt: new Date().toISOString(),
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [db, settings],
  );

  return {
    settings,
    updateSettings,
    isLoading: isLoading || dbLoading,
  };
}
