import type { Project, Area } from "@/api/types";
import { MultiSelect } from "@/components/ui/MultiSelect";

interface Props {
  projects: Project[];
  areas: Area[];
  selectedProjectIds: string[];
  selectedAreaIds: string[];
  onProjectChange: (ids: string[]) => void;
  onAreaChange: (ids: string[]) => void;
}

export function MatrixFilters({
  projects,
  areas,
  selectedProjectIds,
  selectedAreaIds,
  onProjectChange,
  onAreaChange,
}: Props) {
  const projectOptions = projects
    .filter((p) => p.status === "In Progress" || p.status === "Not Started")
    .map((p) => ({ value: p.id, label: p.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const areaOptions = areas
    .map((a) => ({ value: a.id, label: a.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex items-center gap-3">
      <MultiSelect
        options={projectOptions}
        selected={selectedProjectIds}
        onChange={onProjectChange}
        placeholder="Project"
      />
      <MultiSelect
        options={areaOptions}
        selected={selectedAreaIds}
        onChange={onAreaChange}
        placeholder="Area"
      />
    </div>
  );
}
