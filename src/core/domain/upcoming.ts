import type { Company, TaskItem } from "../schema";

export type UpcomingSource = "event" | "es" | "task";

export interface UpcomingItem {
  id: string;
  source: UpcomingSource;
  companyId: string;
  companyName: string;
  stage: string;
  title: string;
  date: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  notes: string;
  location?: string;
  isSample: boolean;
}

export function todayIsoDate(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const EXCLUDED_STAGES = new Set(["paused", "rejected"]);

export function buildUpcomingItems(
  companies: Company[],
  tasks: TaskItem[],
  options: {
    today?: string;
    includeSample?: boolean;
    limit?: number;
  } = {},
): UpcomingItem[] {
  const today = options.today || todayIsoDate();
  const includeSample = options.includeSample ?? true;
  const limit = options.limit ?? 15;

  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const items: UpcomingItem[] = [];

  // 1. Company Events
  for (const company of companies) {
    if (!includeSample && company.isSample) continue;
    if (EXCLUDED_STAGES.has(company.stage)) continue;
    if (company.deletedAt) continue;

    for (const ev of company.events) {
      if (!ev.start) continue;
      const datePart = ev.start.slice(0, 10);
      if (datePart >= today) {
        items.push({
          id: ev.id,
          source: "event",
          companyId: company.id,
          companyName: company.name,
          stage: company.stage,
          title: `[${ev.kind}] ${ev.title}`,
          date: ev.start,
          notes: ev.notes,
          location: ev.location,
          isSample: company.isSample,
        });
      }
    }

    // 2. ES Deadlines
    for (const es of company.esEntries) {
      if (!es.deadline || es.status === "submitted") continue;
      const datePart = es.deadline.slice(0, 10);
      if (datePart >= today) {
        items.push({
          id: es.id,
          source: "es",
          companyId: company.id,
          companyName: company.name,
          stage: company.stage,
          title: `[ES締切] ${es.title}`,
          date: es.deadline,
          notes: es.question,
          isSample: company.isSample,
        });
      }
    }
  }

  // 3. Tasks
  for (const task of tasks) {
    if (!includeSample && task.isSample) continue;
    if (task.deletedAt || task.state === "done") continue;
    if (!task.due) continue;

    const company = task.companyId ? companyMap.get(task.companyId) : undefined;
    if (company && EXCLUDED_STAGES.has(company.stage)) continue;

    if (task.due >= today) {
      items.push({
        id: task.id,
        source: "task",
        companyId: company?.id ?? "",
        companyName: company?.name ?? "共通",
        stage: company?.stage ?? "",
        title: `[タスク] ${task.title}`,
        date: task.due,
        notes: task.notes,
        isSample: task.isSample,
      });
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}
