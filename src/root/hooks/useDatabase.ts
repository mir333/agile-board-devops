import { useEffect, useState } from "react";
import { type AppDatabase, getDatabase } from "@/root/db";

export function useDatabase() {
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initDb() {
      try {
        const database = await getDatabase();
        if (!cancelled) {
          setDb(database);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to initialize database"));
          setIsLoading(false);
        }
      }
    }

    initDb();

    return () => {
      cancelled = true;
    };
  }, []);

  return { db, isLoading, error };
}
