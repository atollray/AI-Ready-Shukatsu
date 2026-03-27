import { promises as fs } from "fs";
import path from "path";

import { createDefaultWorkspaceData } from "@/lib/default-data";
import type {
  CompanyEvent,
  CompanyRecord,
  ContactEntry,
  DocumentEntry,
  EsEntry,
  InterviewEntry,
  JournalEntry,
  TaskItem,
  WorkspaceData,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const WORKSPACE_SPLIT_DIR = path.join(DATA_DIR, "workspace");
const WORKSPACE_META_FILE = path.join(WORKSPACE_SPLIT_DIR, "meta.json");
const WORKSPACE_PROFILE_FILE = path.join(WORKSPACE_SPLIT_DIR, "profile.json");
const WORKSPACE_TASKS_FILE = path.join(WORKSPACE_SPLIT_DIR, "tasks.json");
const WORKSPACE_COMPANIES_FILE = path.join(WORKSPACE_SPLIT_DIR, "companies.json");
const WORKSPACE_JOURNAL_FILE = path.join(
  WORKSPACE_SPLIT_DIR,
  "journal-entries.json"
);
const COMPANIES_DIR = path.join(DATA_DIR, "companies");
const AI_DIR = path.join(DATA_DIR, "ai");
const GENERATED_COMPANY_MANIFEST_FILE = path.join(
  AI_DIR,
  "generated-company-files.json"
);
const UPCOMING_LIMIT = 8;
const TOP_COMPANIES_LIMIT = 5;
const CONTEXT_TASK_LIMIT = 5;
const DEADLINE_SUMMARY_LIMIT = 3;
const EXCLUDED_UPCOMING_STAGES = new Set<CompanyRecord["stage"]>([
  "paused",
  "rejected",
]);

type GeneratedCompanyManifest = {
  files: string[];
  updatedAt: string;
};

type WorkspaceMeta = {
  version: number;
  updatedAt: string;
};

type UpcomingItem =
  | {
      source: "task";
      id: string;
      title: string;
      date: string;
      notes: string;
      state: TaskItem["state"];
      company: string;
      stage: CompanyRecord["stage"] | "";
    }
  | {
      source: "event";
      id: string;
      title: string;
      date: string;
      notes: string;
      location: string;
      eventType: CompanyEvent["type"];
      company: string;
      stage: CompanyRecord["stage"];
    };

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeId(value: unknown, fallback: string): string {
  const candidate = normalizeString(value).trim();
  return candidate || fallback;
}

function clampScore(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 3;
  }

  return Math.min(5, Math.max(1, Math.round(value)));
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "company";
}

function ensureUniqueSlug(base: string, used: Set<string>): string {
  let candidate = base;
  let counter = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  used.add(candidate);
  return candidate;
}

function normalizeEsEntries(value: unknown): EsEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = entry as Partial<EsEntry>;
    return {
      id: normalizeId(item.id, `es-${index + 1}`),
      title: normalizeString(item.title),
      question: normalizeString(item.question),
      draft: normalizeString(item.draft),
      status:
        item.status === "draft" ||
        item.status === "review" ||
        item.status === "submitted"
          ? item.status
          : "idea",
      deadline: normalizeString(item.deadline),
    };
  });
}

function normalizeEvents(value: unknown): CompanyEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = entry as Partial<CompanyEvent>;
    return {
      id: normalizeId(item.id, `event-${index + 1}`),
      title: normalizeString(item.title),
      type:
        item.type === "seminar" ||
        item.type === "internship" ||
        item.type === "interview" ||
        item.type === "test" ||
        item.type === "obog" ||
        item.type === "other"
          ? item.type
          : "deadline",
      date: normalizeString(item.date),
      location: normalizeString(item.location),
      notes: normalizeString(item.notes),
    };
  });
}

function normalizeContacts(value: unknown): ContactEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = entry as Partial<ContactEntry>;
    return {
      id: normalizeId(item.id, `contact-${index + 1}`),
      name: normalizeString(item.name),
      role: normalizeString(item.role),
      channel: normalizeString(item.channel),
      email: normalizeString(item.email),
      notes: normalizeString(item.notes),
    };
  });
}

function normalizeInterviews(value: unknown): InterviewEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = entry as Partial<InterviewEntry>;
    return {
      id: normalizeId(item.id, `interview-${index + 1}`),
      round: normalizeString(item.round),
      date: normalizeString(item.date),
      format: normalizeString(item.format),
      outcome: normalizeString(item.outcome),
      questions: normalizeString(item.questions),
      reflections: normalizeString(item.reflections),
    };
  });
}

function normalizeDocuments(value: unknown): DocumentEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = entry as Partial<DocumentEntry>;
    return {
      id: normalizeId(item.id, `document-${index + 1}`),
      label: normalizeString(item.label),
      path: normalizeString(item.path),
      notes: normalizeString(item.notes),
    };
  });
}

function normalizeCompanies(value: unknown): CompanyRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const usedSlugs = new Set<string>();

  return value.map((entry, index) => {
    const item = entry as Partial<CompanyRecord>;
    const name = normalizeString(item.name) || `企業 ${index + 1}`;
    const baseSlug = slugify(normalizeString(item.slug) || name);

    return {
      id: normalizeId(item.id, `company-${index + 1}`),
      slug: ensureUniqueSlug(baseSlug, usedSlugs),
      name,
      industry: normalizeString(item.industry),
      stage:
        item.stage === "researching" ||
        item.stage === "es" ||
        item.stage === "applied" ||
        item.stage === "interview" ||
        item.stage === "offer" ||
        item.stage === "paused" ||
        item.stage === "rejected"
          ? item.stage
          : "wishlist",
      priority:
        item.priority === "medium" || item.priority === "low"
          ? item.priority
          : "high",
      interestScore: clampScore(item.interestScore),
      fitScore: clampScore(item.fitScore),
      applicationUrl: normalizeString(item.applicationUrl),
      careersUrl: normalizeString(item.careersUrl),
      headquarters: normalizeString(item.headquarters),
      tags: normalizeStringArray(item.tags),
      motivation: normalizeString(item.motivation),
      sellingPoints: normalizeString(item.sellingPoints),
      concerns: normalizeString(item.concerns),
      conditions: normalizeString(item.conditions),
      nextAction: normalizeString(item.nextAction),
      notes: normalizeString(item.notes),
      updatedAt: normalizeString(item.updatedAt) || new Date().toISOString(),
      esEntries: normalizeEsEntries(item.esEntries),
      events: normalizeEvents(item.events),
      contacts: normalizeContacts(item.contacts),
      interviews: normalizeInterviews(item.interviews),
      documents: normalizeDocuments(item.documents),
    };
  });
}

function normalizeTasks(value: unknown): TaskItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = entry as Partial<TaskItem>;
    return {
      id: normalizeId(item.id, `task-${index + 1}`),
      title: normalizeString(item.title),
      state:
        item.state === "doing" || item.state === "done" ? item.state : "todo",
      dueDate: normalizeString(item.dueDate),
      relatedCompanyId: normalizeString(item.relatedCompanyId),
      notes: normalizeString(item.notes),
    };
  });
}

function normalizeJournalEntries(value: unknown): JournalEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const item = entry as Partial<JournalEntry>;
    return {
      id: normalizeId(item.id, `journal-${index + 1}`),
      date: normalizeString(item.date),
      title: normalizeString(item.title),
      relatedCompanyId: normalizeString(item.relatedCompanyId),
      content: normalizeString(item.content),
    };
  });
}

export function normalizeWorkspace(value: unknown): WorkspaceData {
  const base = (value ?? {}) as Partial<WorkspaceData>;

  return {
    version: typeof base.version === "number" ? base.version : 1,
    updatedAt: new Date().toISOString(),
    profile: {
      name: normalizeString(base.profile?.name),
      school: normalizeString(base.profile?.school),
      graduationYear: normalizeString(base.profile?.graduationYear),
      desiredRoles: normalizeStringArray(base.profile?.desiredRoles),
      desiredIndustries: normalizeStringArray(base.profile?.desiredIndustries),
      domainInterests: normalizeStringArray(base.profile?.domainInterests),
      strengths: normalizeStringArray(base.profile?.strengths),
      priorities: normalizeStringArray(base.profile?.priorities),
      workingPreferences: normalizeString(base.profile?.workingPreferences),
      careerVision: {
        shortTerm: normalizeString(base.profile?.careerVision?.shortTerm),
        midTerm: normalizeString(base.profile?.careerVision?.midTerm),
        longTerm: normalizeString(base.profile?.careerVision?.longTerm),
      },
      weeklyFocus: normalizeString(base.profile?.weeklyFocus),
      memo: normalizeString(base.profile?.memo),
    },
    tasks: normalizeTasks(base.tasks),
    companies: normalizeCompanies(base.companies),
    journalEntries: normalizeJournalEntries(base.journalEntries),
  };
}

function formatList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- なし";
}

function formatOptionalText(value: string): string {
  return value || "未入力";
}

function todayLocalDateString(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isUpcomingDate(value: string, today: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today;
}

function buildUpcomingItems(
  workspace: WorkspaceData,
  limit = UPCOMING_LIMIT
): UpcomingItem[] {
  const today = todayLocalDateString();
  const companyById = new Map(workspace.companies.map((company) => [company.id, company]));

  const tasks: UpcomingItem[] = workspace.tasks
    .filter((task) => {
      if (!task.dueDate || task.state === "done" || !isUpcomingDate(task.dueDate, today)) {
        return false;
      }

      if (!task.relatedCompanyId) {
        return true;
      }

      const relatedCompany = companyById.get(task.relatedCompanyId);
      if (!relatedCompany) {
        return true;
      }

      return !EXCLUDED_UPCOMING_STAGES.has(relatedCompany.stage);
    })
    .map((task) => {
      const relatedCompany = task.relatedCompanyId
        ? companyById.get(task.relatedCompanyId)
        : undefined;

      return {
        source: "task",
        id: task.id,
        title: task.title,
        date: task.dueDate,
        notes: task.notes,
        state: task.state,
        company: relatedCompany?.name ?? "",
        stage: relatedCompany?.stage ?? "",
      };
    });

  const events: UpcomingItem[] = workspace.companies
    .filter((company) => !EXCLUDED_UPCOMING_STAGES.has(company.stage))
    .flatMap((company) =>
      company.events
        .filter((event) => event.date && isUpcomingDate(event.date, today))
        .map((event) => ({
          source: "event" as const,
          id: event.id,
          title: event.title,
          date: event.date,
          notes: event.notes,
          location: event.location,
          eventType: event.type,
          company: company.name,
          stage: company.stage,
        }))
    );

  return [...tasks, ...events]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, limit);
}

function toDaysAgo(value: string): number | null {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return null;
  }

  const diff = Date.now() - time;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function buildStageCounts(workspace: WorkspaceData): Record<string, number> {
  const counts = {
    wishlist: 0,
    researching: 0,
    es: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    paused: 0,
    rejected: 0,
  };

  for (const company of workspace.companies) {
    counts[company.stage] += 1;
  }

  return counts;
}

function buildHighPriorityCompanies(
  workspace: WorkspaceData,
  limit = TOP_COMPANIES_LIMIT
) {
  return workspace.companies
    .filter((company) => company.priority === "high")
    .map((company) => ({
      id: company.id,
      slug: company.slug,
      name: company.name,
      stage: company.stage,
      priority: company.priority,
      interestScore: company.interestScore,
      fitScore: company.fitScore,
      combinedScore: company.interestScore + company.fitScore,
      nextAction: company.nextAction,
      updatedAt: company.updatedAt,
    }))
    .sort((left, right) => {
      if (right.combinedScore !== left.combinedScore) {
        return right.combinedScore - left.combinedScore;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, limit);
}

function buildDueTasksSummary(workspace: WorkspaceData, limit = CONTEXT_TASK_LIMIT) {
  const today = todayLocalDateString();
  const companyById = new Map(workspace.companies.map((company) => [company.id, company]));

  return workspace.tasks
    .filter((task) => task.state !== "done" && isUpcomingDate(task.dueDate, today))
    .map((task) => {
      const relatedCompany = task.relatedCompanyId
        ? companyById.get(task.relatedCompanyId)
        : undefined;
      return {
        id: task.id,
        title: task.title,
        state: task.state,
        dueDate: task.dueDate,
        relatedCompanyId: task.relatedCompanyId,
        relatedCompanyName: relatedCompany?.name ?? "",
        relatedCompanyStage: relatedCompany?.stage ?? "",
        notes: task.notes,
      };
    })
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, limit);
}

function buildFreshnessSummary(workspace: WorkspaceData) {
  const companyFreshness = workspace.companies
    .map((company) => ({
      id: company.id,
      slug: company.slug,
      name: company.name,
      updatedAt: company.updatedAt,
      daysSinceUpdate: toDaysAgo(company.updatedAt),
    }))
    .sort((left, right) => (right.daysSinceUpdate ?? -1) - (left.daysSinceUpdate ?? -1));

  return {
    workspaceUpdatedAt: workspace.updatedAt,
    workspaceDaysSinceUpdate: toDaysAgo(workspace.updatedAt),
    stalestCompanies: companyFreshness.slice(0, 5),
  };
}

function buildContextSummary(workspace: WorkspaceData) {
  return {
    profile: workspace.profile,
    companyCount: workspace.companies.length,
    taskCount: workspace.tasks.length,
    updatedAt: workspace.updatedAt,
    stageCounts: buildStageCounts(workspace),
    highPriorityCompanies: buildHighPriorityCompanies(workspace),
    upcomingTasks: buildDueTasksSummary(workspace),
    freshness: buildFreshnessSummary(workspace),
  };
}

function buildCompanyDeadlineSummary(company: CompanyRecord): string {
  const deadlines = [
    ...company.esEntries
      .filter((entry) => entry.deadline)
      .map((entry) => ({
        date: entry.deadline,
        label: `ES | ${entry.title}`,
      })),
    ...company.events
      .filter((event) => event.type === "deadline" && event.date)
      .map((event) => ({
        date: event.date,
        label: `Event | ${event.title}`,
      })),
  ]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, DEADLINE_SUMMARY_LIMIT);

  return deadlines.length
    ? deadlines.map((item) => `- ${item.date} | ${item.label}`).join("\n")
    : "- なし";
}

async function readGeneratedCompanyManifest(): Promise<GeneratedCompanyManifest> {
  try {
    const raw = await fs.readFile(GENERATED_COMPANY_MANIFEST_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<GeneratedCompanyManifest>;
    return {
      files: Array.isArray(parsed.files) ? parsed.files.slice() : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return { files: [], updatedAt: "" };
  }
}

async function cleanupStaleCompanyFiles(currentFiles: string[]): Promise<void> {
  const manifest = await readGeneratedCompanyManifest();
  const current = new Set(currentFiles);

  await Promise.all(
    manifest.files
      .filter((fileName) => !current.has(fileName))
      .map(async (fileName) => {
        const target = path.join(COMPANIES_DIR, fileName);
        if (path.dirname(target) !== COMPANIES_DIR) {
          return;
        }

        try {
          await fs.unlink(target);
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== "ENOENT") {
            throw error;
          }
        }
      })
  );

  // Migration cleanup: company-level JSON is no longer generated.
  const companyEntries = await fs.readdir(COMPANIES_DIR, { withFileTypes: true });
  await Promise.all(
    companyEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const target = path.join(COMPANIES_DIR, entry.name);
        try {
          await fs.unlink(target);
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code !== "ENOENT") {
            throw error;
          }
        }
      })
  );

  await writeJson(GENERATED_COMPANY_MANIFEST_FILE, {
    files: currentFiles,
    updatedAt: new Date().toISOString(),
  } satisfies GeneratedCompanyManifest);
}

function formatTaskDateLabel(value: string): string {
  return value || "期限未設定";
}

function summarizeText(value: string, length = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= length) {
    return normalized;
  }

  return `${normalized.slice(0, length)}...`;
}

function buildNotesIndexMarkdown(workspace: WorkspaceData): string {
  const companyById = new Map(
    workspace.companies.map((company) => [company.id, company.name])
  );
  const lines = workspace.journalEntries
    .slice()
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((entry) => {
      const companyName = entry.relatedCompanyId
        ? companyById.get(entry.relatedCompanyId) || "未登録企業"
        : "共通";
      const snippet = summarizeText(entry.content);
      return `- ${entry.date || "日付未設定"} | ${companyName} | ${entry.title || "無題ノート"}${snippet ? ` | ${snippet}` : ""}`;
    });

  return `# AI-Ready Shukatsu Notes Index

## Notes
${lines.length ? lines.join("\n") : "- ノートなし"}
`;
}

function formatCompanyMarkdown(
  company: CompanyRecord,
  openTasks: TaskItem[],
  relatedNotes: JournalEntry[]
): string {
  const events = company.events
    .map(
      (event) =>
        `- ${event.date || "日付未定"} | ${event.type} | ${event.title} | ${event.location || "場所未設定"}`
    )
    .join("\n");

  const esEntries = company.esEntries
    .map(
      (entry) =>
        `- ${entry.title} | ${entry.status} | ${entry.deadline || "期限未設定"}`
    )
    .join("\n");

  const interviews = company.interviews
    .map(
      (entry) =>
        `- ${entry.date || "日付未定"} | ${entry.round} | ${entry.outcome || "結果未入力"}`
    )
    .join("\n");

  const contacts = company.contacts
    .map(
      (entry) =>
        `- ${entry.name} | ${entry.role} | ${entry.channel} | ${entry.email}`
    )
    .join("\n");

  const documents = company.documents
    .map((entry) => `- ${entry.label} | ${entry.path}`)
    .join("\n");

  const relatedTaskLines = openTasks
    .map(
      (task) =>
        `- ${formatTaskDateLabel(task.dueDate)} | ${task.state} | ${task.title}`
    )
    .join("\n");

  const relatedNoteTitleLines = relatedNotes
    .map(
      (entry) =>
        `- ${entry.date || "日付未設定"} | ${entry.title || "無題ノート"}`
    )
    .join("\n");

  const links = [
    `- applicationUrl: ${formatOptionalText(company.applicationUrl)}`,
    `- careersUrl: ${formatOptionalText(company.careersUrl)}`,
  ].join("\n");

  const deadlineSummary = buildCompanyDeadlineSummary(company);

  return `# ${company.name}

## Meta
- slug: ${company.slug}
- stage: ${company.stage}
- priority: ${company.priority}
- industry: ${company.industry || "未入力"}
- interestScore: ${company.interestScore}
- fitScore: ${company.fitScore}
- updatedAt: ${company.updatedAt}

## Tags
${formatList(company.tags)}

## Basic Info
- headquarters: ${formatOptionalText(company.headquarters)}

## Links
${links}

## Motivation
${company.motivation || "未入力"}

## Selling Points
${company.sellingPoints || "未入力"}

## Concerns
${company.concerns || "未入力"}

## Conditions
${company.conditions || "未入力"}

## Next Action
${company.nextAction || "未入力"}

## Notes
${company.notes || "未入力"}

## ES
${esEntries || "- なし"}

## Key Deadlines
${deadlineSummary}

## Open Tasks
${relatedTaskLines || "- なし"}

## Related Notes
${relatedNoteTitleLines || "- なし"}

## Events
${events || "- なし"}

## Interviews
${interviews || "- なし"}

## Contacts
${contacts || "- なし"}

## Documents
${documents || "- なし"}
`;
}

function buildDashboardMarkdown(workspace: WorkspaceData): string {
  const upcoming = buildUpcomingItems(workspace);

  return `# AI-Ready Shukatsu Dashboard

## Profile
- name: ${workspace.profile.name || "未入力"}
- school: ${workspace.profile.school || "未入力"}
- graduationYear: ${workspace.profile.graduationYear || "未入力"}

## Desired Roles
${formatList(workspace.profile.desiredRoles)}

## Desired Industries
${formatList(workspace.profile.desiredIndustries)}

## Domain Interests
${formatList(workspace.profile.domainInterests)}

## Priorities
${formatList(workspace.profile.priorities)}

## Career Vision
- 短期: ${workspace.profile.careerVision.shortTerm || "未入力"}
- 中期: ${workspace.profile.careerVision.midTerm || "未入力"}
- 長期: ${workspace.profile.careerVision.longTerm || "未入力"}

## Upcoming
${upcoming.length
    ? upcoming
        .map((item) => {
          if (item.source === "task") {
            const companySuffix = item.company ? ` | ${item.company}` : "";
            return `- ${item.date} | Task | ${item.title}${companySuffix}`;
          }

          return `- ${item.date} | ${item.company} | ${item.eventType} | ${item.title}`;
        })
        .join("\n")
    : "- 予定なし"}

## Company Summary
${workspace.companies.length ? workspace.companies.map((company) => `- ${company.name} | ${company.stage} | next: ${company.nextAction || "未入力"}`).join("\n") : "- 企業データなし"}
`;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

function toIcsDate(value: string): string {
  if (!value) {
    return "";
  }

  return value.replace(/-/g, "");
}

function buildCalendarIcs(workspace: WorkspaceData): string {
  const entries = [
    ...workspace.tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        uid: task.id,
        date: task.dueDate,
        summary: `Task: ${task.title}`,
        description: task.notes || "Task",
      })),
    ...workspace.companies.flatMap((company) =>
      company.events
        .filter((event) => event.date)
        .map((event) => ({
          uid: event.id,
          date: event.date,
          summary: `${company.name}: ${event.title}`,
          description: `${event.type} ${event.location ? `| ${event.location}` : ""} ${event.notes}`.trim(),
        }))
    ),
  ];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Satella//AI-Ready Shukatsu Assistant//JA",
    ...entries.flatMap((entry) => [
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(entry.uid)}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
      `DTSTART;VALUE=DATE:${toIcsDate(entry.date)}`,
      `SUMMARY:${escapeIcsText(entry.summary)}`,
      `DESCRIPTION:${escapeIcsText(entry.description)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(WORKSPACE_SPLIT_DIR, { recursive: true });
  await fs.mkdir(COMPANIES_DIR, { recursive: true });
  await fs.mkdir(AI_DIR, { recursive: true });
}

async function readJson(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function loadSplitWorkspace(): Promise<WorkspaceData | null> {
  const [metaRaw, profile, tasks, companies, journalEntries] = await Promise.all([
    readJson(WORKSPACE_META_FILE),
    readJson(WORKSPACE_PROFILE_FILE),
    readJson(WORKSPACE_TASKS_FILE),
    readJson(WORKSPACE_COMPANIES_FILE),
    readJson(WORKSPACE_JOURNAL_FILE),
  ]);

  if (
    metaRaw === null ||
    profile === null ||
    tasks === null ||
    companies === null ||
    journalEntries === null
  ) {
    return null;
  }

  const meta = metaRaw as Partial<WorkspaceMeta>;
  return normalizeWorkspace({
    version: meta.version,
    updatedAt: meta.updatedAt,
    profile,
    tasks,
    companies,
    journalEntries,
  });
}

async function writeSplitWorkspace(workspace: WorkspaceData): Promise<void> {
  await ensureDirectories();

  await Promise.all([
    writeJson(WORKSPACE_META_FILE, {
      version: workspace.version,
      updatedAt: workspace.updatedAt,
    } satisfies WorkspaceMeta),
    writeJson(WORKSPACE_PROFILE_FILE, workspace.profile),
    writeJson(WORKSPACE_TASKS_FILE, workspace.tasks),
    writeJson(WORKSPACE_COMPANIES_FILE, workspace.companies),
    writeJson(WORKSPACE_JOURNAL_FILE, workspace.journalEntries),
  ]);
}

async function syncAiExports(workspace: WorkspaceData): Promise<void> {
  await ensureDirectories();
  const upcomingItems = buildUpcomingItems(workspace);
  const generatedCompanyFiles = workspace.companies.map(
    (company) => `${company.slug}.md`
  );

  await writeJson(path.join(AI_DIR, "context.json"), buildContextSummary(workspace));
  await writeJson(
    path.join(AI_DIR, "upcoming-events.json"),
    upcomingItems.map((item) => {
      if (item.source === "task") {
        return {
          source: item.source,
          company: item.company,
          stage: item.stage,
          id: item.id,
          title: item.title,
          type: "task",
          state: item.state,
          date: item.date,
          location: "",
          notes: item.notes,
        };
      }

      return {
        source: item.source,
        company: item.company,
        stage: item.stage,
        id: item.id,
        title: item.title,
        type: item.eventType,
        date: item.date,
        location: item.location,
        notes: item.notes,
      };
    })
  );
  await fs.writeFile(
    path.join(DATA_DIR, "dashboard.md"),
    buildDashboardMarkdown(workspace),
    "utf8"
  );
  await fs.writeFile(
    path.join(AI_DIR, "notes-index.md"),
    buildNotesIndexMarkdown(workspace),
    "utf8"
  );
  await fs.writeFile(
    path.join(DATA_DIR, "calendar.ics"),
    buildCalendarIcs(workspace),
    "utf8"
  );

  await Promise.all(
    workspace.companies.map((company) => {
      const openTasks = workspace.tasks
        .filter(
          (task) =>
            task.relatedCompanyId === company.id && task.state !== "done"
        )
        .slice()
        .sort((left, right) => {
          if (!left.dueDate && !right.dueDate) {
            return left.title.localeCompare(right.title);
          }

          if (!left.dueDate) {
            return 1;
          }

          if (!right.dueDate) {
            return -1;
          }

          return left.dueDate.localeCompare(right.dueDate);
        });

      const relatedNotes = workspace.journalEntries
        .filter((entry) => entry.relatedCompanyId === company.id)
        .slice()
        .sort((left, right) => right.date.localeCompare(left.date));

      return fs.writeFile(
        path.join(COMPANIES_DIR, `${company.slug}.md`),
        formatCompanyMarkdown(company, openTasks, relatedNotes),
        "utf8"
      );
    })
  );
  await cleanupStaleCompanyFiles(generatedCompanyFiles);
}

export async function ensureWorkspace(): Promise<WorkspaceData> {
  await ensureDirectories();

  const splitWorkspace = await loadSplitWorkspace();
  if (splitWorkspace) {
    await syncAiExports(splitWorkspace);
    return splitWorkspace;
  }

  const initial = createDefaultWorkspaceData();
  const normalized = normalizeWorkspace(initial);
  await writeSplitWorkspace(normalized);
  await syncAiExports(normalized);
  return normalized;
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  return ensureWorkspace();
}

export async function saveWorkspace(workspace: unknown): Promise<WorkspaceData> {
  const normalized = normalizeWorkspace(workspace);
  await writeSplitWorkspace(normalized);
  await syncAiExports(normalized);
  return normalized;
}
