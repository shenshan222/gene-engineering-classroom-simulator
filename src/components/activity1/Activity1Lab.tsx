import { LigationActivityLab } from "@/src/components/activity1/LigationActivityLab";
import { getWorksheetTask } from "@/src/content/worksheetTasks";

export function Activity1Lab() {
  const task = getWorksheetTask("worksheet-1-linear-ecori");
  if (!task || task.taskKind !== "ligation") {
    throw new Error("Missing activity 1 task.");
  }
  return <LigationActivityLab task={task} />;
}
