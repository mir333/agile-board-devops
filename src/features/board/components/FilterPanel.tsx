import { Filter, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { AzureProject } from "../lib/azure-api";

interface FilterPanelProps {
  projects: AzureProject[];
  selectedProject: string;
  onProjectChange: (project: string) => void;
  states: string[];
  selectedStates: string[];
  onStatesChange: (states: string[]) => void;
  types: string[];
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  onLoad: () => void;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterPanel({
  projects,
  selectedProject,
  onProjectChange,
  states,
  selectedStates,
  onStatesChange,
  types,
  selectedTypes,
  onTypesChange,
  onLoad,
  isLoading,
  isOpen,
  onToggle,
}: FilterPanelProps) {
  function toggleState(state: string) {
    if (selectedStates.includes(state)) {
      onStatesChange(selectedStates.filter((s) => s !== state));
    } else {
      onStatesChange([...selectedStates, state]);
    }
  }

  function toggleType(type: string) {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  }

  if (!isOpen) {
    return (
      <div className="absolute left-3 top-3 z-50">
        <Button variant="secondary" size="icon" onClick={onToggle} title="Open filters">
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute left-3 top-3 bottom-3 z-50 w-72 rounded-lg border bg-card shadow-lg overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold text-sm">Filters</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-medium">Project</Label>
          <Select value={selectedProject} onValueChange={onProjectChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.name}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-medium">State</Label>
          <div className="space-y-2">
            {states.map((state) => (
              <div key={state} className="flex items-center gap-2">
                <Checkbox
                  id={`state-${state}`}
                  checked={selectedStates.includes(state)}
                  onCheckedChange={() => toggleState(state)}
                />
                <Label htmlFor={`state-${state}`} className="text-sm font-normal cursor-pointer">
                  {state}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-medium">Work Item Type</Label>
          <div className="space-y-2">
            {types.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                />
                <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer">
                  {type}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <Button className="w-full" onClick={onLoad} disabled={!selectedProject || isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Load Work Items"
          )}
        </Button>
      </div>
    </div>
  );
}
