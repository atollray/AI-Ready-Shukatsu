import type { TaskItem } from "../schema";

export function deriveNextAction(companyId: string, tasks: TaskItem[]): string {
  const openTasks = tasks
    .filter((t) => t.companyId === companyId && t.state !== "done" && !t.deletedAt)
    .sort((a, b) => {
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return a.title.localeCompare(b.title);
    });

  const first = openTasks[0];
  if (!first) return "";

  const prefix = first.due ? `[${first.due}] ` : "";
  return `${prefix}${first.title}`;
}
