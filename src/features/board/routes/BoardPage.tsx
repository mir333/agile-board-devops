import type { Editor } from "@tldraw/editor";
import { useCallback, useRef, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { BoardCanvas, syncWorkItemsOnCanvas } from "../components/BoardCanvas";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { QueryPanel } from "../components/QueryPanel";
import { useAzureDevOps } from "../hooks/useAzureDevOps";

export function BoardPage() {
  const editorRef = useRef<Editor | null>(null);
  const { settings, updateSettings } = useSettings();
  const { isConfigured, savedQueries, isLoading, error, loadSavedQueries, executeSavedQuery } =
    useAzureDevOps();

  const [hasLoadedQueries, setHasLoadedQueries] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const handleEditorMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      if (isConfigured && !hasLoadedQueries) {
        loadSavedQueries();
        setHasLoadedQueries(true);
      }
    },
    [isConfigured, hasLoadedQueries, loadSavedQueries],
  );

  const handleQueryChange = useCallback(
    (queryId: string) => {
      const query = savedQueries.find((q) => q.id === queryId);
      updateSettings({
        azureDevOpsQueryId: queryId,
        azureDevOpsQueryName: query?.name ?? "",
      });
    },
    [savedQueries, updateSettings],
  );

  const handleSync = useCallback(async () => {
    if (!settings.azureDevOpsQueryId) return;

    const items = await executeSavedQuery(settings.azureDevOpsQueryId);

    if (editorRef.current) {
      syncWorkItemsOnCanvas(editorRef.current, items, settings.azureDevOpsOrg);
    }

    setLastSynced(new Date());
  }, [settings.azureDevOpsQueryId, settings.azureDevOpsOrg, executeSavedQuery]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <BoardCanvas onEditorMount={handleEditorMount} />
      <ConnectionBanner isConfigured={isConfigured} error={error} />
      <QueryPanel
        queries={savedQueries}
        selectedQueryId={settings.azureDevOpsQueryId}
        onQueryChange={handleQueryChange}
        onSync={handleSync}
        isLoading={isLoading}
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen((prev) => !prev)}
        lastSynced={lastSynced}
      />
    </div>
  );
}
