import type { Editor } from "@tldraw/editor";
import { useCallback, useRef, useState } from "react";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { BoardCanvas, placeWorkItemsOnCanvas } from "../components/BoardCanvas";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { FilterPanel } from "../components/FilterPanel";
import { useAzureDevOps } from "../hooks/useAzureDevOps";
import { useBoardFilters } from "../hooks/useBoardFilters";

export function BoardPage() {
  const editorRef = useRef<Editor | null>(null);
  const { settings } = useSettings();
  const { isConfigured, projects, isLoading, error, loadProjects, loadWorkItems } =
    useAzureDevOps();

  const {
    selectedProject,
    setSelectedProject,
    selectedStates,
    setSelectedStates,
    selectedTypes,
    setSelectedTypes,
    isFilterOpen,
    toggleFilterPanel,
    availableStates,
    availableTypes,
  } = useBoardFilters();

  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);

  const handleEditorMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      if (isConfigured && !hasLoadedProjects) {
        loadProjects();
        setHasLoadedProjects(true);
      }
    },
    [isConfigured, hasLoadedProjects, loadProjects],
  );

  const handleProjectChange = useCallback(
    (project: string) => {
      setSelectedProject(project);
    },
    [setSelectedProject],
  );

  const handleLoadWorkItems = useCallback(async () => {
    if (!selectedProject) return;

    const items = await loadWorkItems(selectedProject, {
      project: selectedProject,
      states: selectedStates.length > 0 ? selectedStates : undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
    });

    if (editorRef.current && items && items.length > 0) {
      placeWorkItemsOnCanvas(editorRef.current, items, settings.azureDevOpsOrg);
    }
  }, [selectedProject, selectedStates, selectedTypes, loadWorkItems, settings.azureDevOpsOrg]);

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <BoardCanvas onEditorMount={handleEditorMount} />
      <ConnectionBanner isConfigured={isConfigured} error={error} />
      <FilterPanel
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={handleProjectChange}
        states={availableStates}
        selectedStates={selectedStates}
        onStatesChange={setSelectedStates}
        types={availableTypes}
        selectedTypes={selectedTypes}
        onTypesChange={setSelectedTypes}
        onLoad={handleLoadWorkItems}
        isLoading={isLoading}
        isOpen={isFilterOpen}
        onToggle={toggleFilterPanel}
      />
    </div>
  );
}
