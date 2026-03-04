import { useCallback, useState } from "react";

const DEFAULT_STATES = ["New", "Active", "Resolved", "Closed"];
const DEFAULT_TYPES = ["Bug", "User Story", "Task", "Epic"];

export function useBoardFilters() {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const toggleFilterPanel = useCallback(() => {
    setIsFilterOpen((prev) => !prev);
  }, []);

  return {
    selectedProject,
    setSelectedProject,
    selectedStates,
    setSelectedStates,
    selectedTypes,
    setSelectedTypes,
    isFilterOpen,
    toggleFilterPanel,
    availableStates: DEFAULT_STATES,
    availableTypes: DEFAULT_TYPES,
  };
}
