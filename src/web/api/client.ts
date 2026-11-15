import type { Company, NoteItem, ProfileData, TaskItem } from "@/core/client";

export interface WorkspaceSnapshot {
  meta: { schemaVersion: number; updatedAt: string };
  profile: ProfileData;
  companies: Company[];
  tasks: TaskItem[];
  notes: NoteItem[];
}

export async function fetchWorkspace(): Promise<WorkspaceSnapshot> {
  const res = await fetch("/api/workspace");
  if (!res.ok) throw new Error("Failed to load workspace data");
  const json = await res.json();
  return json.data;
}

export async function patchCompany(
  id: string,
  patch: Partial<Company>,
  expectRev?: number,
): Promise<Company> {
  const res = await fetch(`/api/companies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company: patch, expectRev }),
  });
  if (res.status === 409) {
    const json = await res.json();
    throw new Error(`CONFLICT:${json.error?.currentRev}`);
  }
  if (!res.ok) throw new Error("Failed to save company");
  const json = await res.json();
  return json.data;
}

export async function createCompany(company: Company): Promise<Company> {
  const res = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(company),
  });
  if (!res.ok) throw new Error("Failed to create company");
  const json = await res.json();
  return json.data;
}

export async function deleteCompanyApi(id: string, hard = false): Promise<void> {
  const res = await fetch(`/api/companies/${id}?hard=${hard}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete company");
}

export async function patchTask(
  id: string,
  patch: Partial<TaskItem>,
  expectRev?: number,
): Promise<TaskItem> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: patch, expectRev }),
  });
  if (!res.ok) throw new Error("Failed to save task");
  const json = await res.json();
  return json.data;
}

export async function createTask(task: TaskItem): Promise<TaskItem> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error("Failed to create task");
  const json = await res.json();
  return json.data;
}

export async function deleteTaskApi(id: string, hard = false): Promise<void> {
  const res = await fetch(`/api/tasks/${id}?hard=${hard}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
}

export async function patchNote(
  id: string,
  patch: Partial<NoteItem>,
  expectRev?: number,
): Promise<NoteItem> {
  const res = await fetch(`/api/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: patch, expectRev }),
  });
  if (!res.ok) throw new Error("Failed to save note");
  const json = await res.json();
  return json.data;
}

export async function createNote(note: NoteItem): Promise<NoteItem> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
  if (!res.ok) throw new Error("Failed to create note");
  const json = await res.json();
  return json.data;
}

export async function deleteNoteApi(id: string, hard = false): Promise<void> {
  const res = await fetch(`/api/notes/${id}?hard=${hard}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete note");
}

export async function patchProfile(patch: Partial<ProfileData>): Promise<ProfileData> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  const json = await res.json();
  return json.data;
}

export async function clearSamplesApi(): Promise<void> {
  const res = await fetch("/api/sample/clear", { method: "POST" });
  if (!res.ok) throw new Error("Failed to clear sample data");
}

export interface WorkspaceBackup {
  exportedAt: string;
  meta?: { schemaVersion: number; updatedAt: string };
  profile?: Partial<ProfileData>;
  companies: Company[];
  tasks: TaskItem[];
  notes: NoteItem[];
}

export interface ImportBackupResult {
  mode: "merge" | "replace";
  imported: {
    companies: number;
    tasks: number;
    notes: number;
    profileUpdated: boolean;
  };
}

export async function exportWorkspaceBackup(): Promise<WorkspaceBackup> {
  const res = await fetch("/api/export");
  if (!res.ok) throw new Error("Failed to export workspace backup");
  return res.json();
}

export async function importWorkspaceBackup(
  backup: WorkspaceBackup,
  mode: "merge" | "replace" = "merge",
): Promise<ImportBackupResult> {
  const res = await fetch(`/api/import?mode=${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backup),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || "Failed to import workspace backup");
  }
  const json = await res.json();
  return json.data;
}
