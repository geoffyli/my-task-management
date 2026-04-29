export interface Task {
  id: string;
  name: string;
  status: "Not Started" | "In Progress" | "Done" | "Cancelled" | "Deferred";
  priority: "High" | "Medium" | "Low";
  projectIds: string[];
  assignedDate: string | null;
  initialAssignedDate: string | null;
  deadline: string | null;
  createdTime: string;
  lastEditedTime: string;
  dependencies: string[];
}

export interface Project {
  id: string;
  name: string;
  status: "In Progress" | "Completed";
  priority: "High" | "Medium" | "Low";
  areaIds: string[];
  startDate: string | null;
  endDate: string | null;
}

export interface Area {
  id: string;
  name: string;
}
