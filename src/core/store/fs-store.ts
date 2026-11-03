import fs from "node:fs/promises";
import path from "node:path";
import { buildUpcomingItems } from "../domain/upcoming";
import { formatCalendarIcs } from "../exporters/calendar";
import { formatCompanyMarkdown } from "../exporters/company";
import { formatContextMarkdown } from "../exporters/context";
import { formatNotesIndexMarkdown } from "../exporters/notes-index";
import { formatUpcomingMarkdown } from "../exporters/upcoming";
import {
  type Company,
  CompanySchema,
  type MetaData,
  MetaDataSchema,
  type NoteItem,
  NoteItemSchema,
  type ProfileData,
  ProfileDataSchema,
  type TaskItem,
  TaskItemSchema,
} from "../schema";
import { ConflictError, type DoctorReport, NotFoundError, type Store } from "./interface";
import {
  createSampleCompanies,
  createSampleNotes,
  createSampleProfile,
  createSampleTasks,
} from "./sample-data";

export interface FsStoreOptions {
  dataDir?: string;
  lockTimeoutMs?: number;
  staleLockAgeMs?: number;
}

export class FsStore implements Store {
  readonly dataDir: string;
  private readonly storeDir: string;
  private readonly viewsDir: string;
  private readonly companiesDir: string;
  private readonly tasksDir: string;
  private readonly notesDir: string;
  private readonly viewCompaniesDir: string;
  private readonly lockFile: string;
  private readonly metaFile: string;
  private readonly profileFile: string;
  private readonly lockTimeoutMs: number;
  private readonly staleLockAgeMs: number;

  constructor(options: FsStoreOptions = {}) {
    this.dataDir = options.dataDir
      ? path.resolve(options.dataDir)
      : path.resolve(process.cwd(), "data");

    this.storeDir = path.join(this.dataDir, "store");
    this.viewsDir = path.join(this.dataDir, "views");
    this.companiesDir = path.join(this.storeDir, "companies");
    this.tasksDir = path.join(this.storeDir, "tasks");
    this.notesDir = path.join(this.storeDir, "notes");
    this.viewCompaniesDir = path.join(this.viewsDir, "companies");
    this.lockFile = path.join(this.dataDir, ".lock");
    this.metaFile = path.join(this.storeDir, "meta.json");
    this.profileFile = path.join(this.storeDir, "profile.json");
    this.lockTimeoutMs = options.lockTimeoutMs ?? 5000;
    this.staleLockAgeMs = options.staleLockAgeMs ?? 30000;
  }

  private async ensureDirs(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.storeDir, { recursive: true });
    await fs.mkdir(this.viewsDir, { recursive: true });
    await fs.mkdir(this.companiesDir, { recursive: true });
    await fs.mkdir(this.tasksDir, { recursive: true });
    await fs.mkdir(this.notesDir, { recursive: true });
    await fs.mkdir(this.viewCompaniesDir, { recursive: true });
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureDirs();
    const startTime = Date.now();

    while (true) {
      try {
        const handle = await fs.open(this.lockFile, "wx");
        await handle.writeFile(JSON.stringify({ pid: process.pid, time: Date.now() }));
        await handle.close();
        break;
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "EEXIST") {
          try {
            const stat = await fs.stat(this.lockFile);
            if (Date.now() - stat.mtimeMs > this.staleLockAgeMs) {
              await fs.unlink(this.lockFile).catch(() => {});
              continue;
            }
          } catch {
            // lock file disappeared, retry immediately
            continue;
          }

          if (Date.now() - startTime > this.lockTimeoutMs) {
            throw new Error(
              `Lock acquisition timed out after ${this.lockTimeoutMs}ms on ${this.lockFile}`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        } else {
          throw err;
        }
      }
    }

    try {
      return await fn();
    } finally {
      await fs.unlink(this.lockFile).catch(() => {});
    }
  }

  private async atomicWriteFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = path.join(dir, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    await fs.writeFile(tmpPath, content, "utf8");
    await fs.rename(tmpPath, filePath);
  }

  private async atomicWriteJson(filePath: string, data: unknown): Promise<void> {
    await this.atomicWriteFile(filePath, JSON.stringify(data, null, 2));
  }

  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return null;
      throw err;
    }
  }

  async init(options: { sample?: boolean } = {}): Promise<void> {
    const withSample = options.sample ?? true;
    await this.ensureDirs();

    await this.withLock(async () => {
      const meta = await this.readJson<MetaData>(this.metaFile);
      if (meta) {
        return; // already initialized
      }

      const initialMeta: MetaData = {
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
      };
      await this.atomicWriteJson(this.metaFile, initialMeta);

      const profile = withSample
        ? createSampleProfile()
        : {
            name: "",
            school: "",
            graduationYear: "",
            desiredRoles: [],
            desiredIndustries: [],
            domainInterests: [],
            strengths: [],
            priorities: [],
            workingPreferences: "",
            careerVision: { shortTerm: "", midTerm: "", longTerm: "" },
            weeklyFocus: "",
            memo: "",
            updatedAt: new Date().toISOString(),
          };
      await this.atomicWriteJson(this.profileFile, profile);

      if (withSample) {
        for (const company of createSampleCompanies()) {
          const filePath = path.join(this.companiesDir, `${company.id}.json`);
          await this.atomicWriteJson(filePath, company);
        }

        for (const task of createSampleTasks()) {
          const filePath = path.join(this.tasksDir, `${task.id}.json`);
          await this.atomicWriteJson(filePath, task);
        }

        for (const note of createSampleNotes()) {
          const filePath = path.join(this.notesDir, `${note.id}.json`);
          await this.atomicWriteJson(filePath, note);
        }
      }
    });

    await this.syncViews();
  }

  async getMeta(): Promise<MetaData> {
    const meta = await this.readJson<MetaData>(this.metaFile);
    if (!meta) {
      await this.init();
      return (await this.readJson<MetaData>(this.metaFile))!;
    }
    return MetaDataSchema.parse(meta);
  }

  async getProfile(): Promise<ProfileData> {
    const profile = await this.readJson<ProfileData>(this.profileFile);
    if (!profile) {
      await this.init();
      return (await this.readJson<ProfileData>(this.profileFile))!;
    }
    return ProfileDataSchema.parse(profile);
  }

  async updateProfile(patch: Partial<ProfileData>): Promise<ProfileData> {
    return this.withLock(async () => {
      const current = await this.getProfile();
      const updated: ProfileData = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      const parsed = ProfileDataSchema.parse(updated);
      await this.atomicWriteJson(this.profileFile, parsed);
      return parsed;
    });
  }

  async listCompanies(
    filter: { includeDeleted?: boolean; includeSample?: boolean } = {},
  ): Promise<Company[]> {
    const includeDeleted = filter.includeDeleted ?? false;
    const includeSample = filter.includeSample ?? true;

    let files: string[] = [];
    try {
      files = await fs.readdir(this.companiesDir);
    } catch {
      return [];
    }

    const companies: Company[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = await this.readJson<unknown>(path.join(this.companiesDir, file));
      if (!data) continue;
      try {
        const company = CompanySchema.parse(data);
        if (!includeDeleted && company.deletedAt) continue;
        if (!includeSample && company.isSample) continue;
        companies.push(company);
      } catch (err) {
        console.error(`Skipping invalid company file ${file}:`, err);
      }
    }

    return companies.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getCompany(id: string): Promise<Company | null> {
    const file = path.join(this.companiesDir, `${id}.json`);
    const data = await this.readJson<unknown>(file);
    if (!data) return null;
    return CompanySchema.parse(data);
  }

  async saveCompany(company: Company, expectRev?: number): Promise<Company> {
    const result = await this.withLock(async () => {
      const file = path.join(this.companiesDir, `${company.id}.json`);
      const existing = await this.readJson<Company>(file);

      if (existing) {
        if (expectRev !== undefined && existing.rev !== expectRev) {
          throw new ConflictError(company.id, existing.rev);
        }
        company.rev = existing.rev + 1;
      } else {
        company.rev = 1;
      }

      company.updatedAt = new Date().toISOString();
      const parsed = CompanySchema.parse(company);
      await this.atomicWriteJson(file, parsed);
      return parsed;
    });

    await this.syncViews();
    return result;
  }

  async deleteCompany(id: string, hard = false): Promise<void> {
    await this.withLock(async () => {
      const file = path.join(this.companiesDir, `${id}.json`);
      const existing = await this.readJson<Company>(file);
      if (!existing) throw new NotFoundError("Company", id);

      if (hard) {
        await fs.unlink(file).catch(() => {});
      } else {
        existing.deletedAt = new Date().toISOString();
        existing.rev += 1;
        existing.updatedAt = new Date().toISOString();
        await this.atomicWriteJson(file, existing);
      }
    });

    await this.syncViews();
  }

  async listTasks(
    filter: { includeDeleted?: boolean; includeSample?: boolean } = {},
  ): Promise<TaskItem[]> {
    const includeDeleted = filter.includeDeleted ?? false;
    const includeSample = filter.includeSample ?? true;

    let files: string[] = [];
    try {
      files = await fs.readdir(this.tasksDir);
    } catch {
      return [];
    }

    const tasks: TaskItem[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = await this.readJson<unknown>(path.join(this.tasksDir, file));
      if (!data) continue;
      try {
        const task = TaskItemSchema.parse(data);
        if (!includeDeleted && task.deletedAt) continue;
        if (!includeSample && task.isSample) continue;
        tasks.push(task);
      } catch (err) {
        console.error(`Skipping invalid task file ${file}:`, err);
      }
    }

    return tasks.sort((a, b) => {
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  async getTask(id: string): Promise<TaskItem | null> {
    const file = path.join(this.tasksDir, `${id}.json`);
    const data = await this.readJson<unknown>(file);
    if (!data) return null;
    return TaskItemSchema.parse(data);
  }

  async saveTask(task: TaskItem, expectRev?: number): Promise<TaskItem> {
    const result = await this.withLock(async () => {
      const file = path.join(this.tasksDir, `${task.id}.json`);
      const existing = await this.readJson<TaskItem>(file);

      if (existing) {
        if (expectRev !== undefined && existing.rev !== expectRev) {
          throw new ConflictError(task.id, existing.rev);
        }
        task.rev = existing.rev + 1;
      } else {
        task.rev = 1;
      }

      task.updatedAt = new Date().toISOString();
      const parsed = TaskItemSchema.parse(task);
      await this.atomicWriteJson(file, parsed);
      return parsed;
    });

    await this.syncViews();
    return result;
  }

  async deleteTask(id: string, hard = false): Promise<void> {
    await this.withLock(async () => {
      const file = path.join(this.tasksDir, `${id}.json`);
      const existing = await this.readJson<TaskItem>(file);
      if (!existing) throw new NotFoundError("Task", id);

      if (hard) {
        await fs.unlink(file).catch(() => {});
      } else {
        existing.deletedAt = new Date().toISOString();
        existing.rev += 1;
        existing.updatedAt = new Date().toISOString();
        await this.atomicWriteJson(file, existing);
      }
    });

    await this.syncViews();
  }

  async listNotes(
    filter: { includeDeleted?: boolean; includeSample?: boolean } = {},
  ): Promise<NoteItem[]> {
    const includeDeleted = filter.includeDeleted ?? false;
    const includeSample = filter.includeSample ?? true;

    let files: string[] = [];
    try {
      files = await fs.readdir(this.notesDir);
    } catch {
      return [];
    }

    const notes: NoteItem[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = await this.readJson<unknown>(path.join(this.notesDir, file));
      if (!data) continue;
      try {
        const note = NoteItemSchema.parse(data);
        if (!includeDeleted && note.deletedAt) continue;
        if (!includeSample && note.isSample) continue;
        notes.push(note);
      } catch (err) {
        console.error(`Skipping invalid note file ${file}:`, err);
      }
    }

    return notes.sort((a, b) => b.date.localeCompare(a.date));
  }

  async getNote(id: string): Promise<NoteItem | null> {
    const file = path.join(this.notesDir, `${id}.json`);
    const data = await this.readJson<unknown>(file);
    if (!data) return null;
    return NoteItemSchema.parse(data);
  }

  async saveNote(note: NoteItem, expectRev?: number): Promise<NoteItem> {
    const result = await this.withLock(async () => {
      const file = path.join(this.notesDir, `${note.id}.json`);
      const existing = await this.readJson<NoteItem>(file);

      if (existing) {
        if (expectRev !== undefined && existing.rev !== expectRev) {
          throw new ConflictError(note.id, existing.rev);
        }
        note.rev = existing.rev + 1;
      } else {
        note.rev = 1;
      }

      note.updatedAt = new Date().toISOString();
      const parsed = NoteItemSchema.parse(note);
      await this.atomicWriteJson(file, parsed);
      return parsed;
    });

    await this.syncViews();
    return result;
  }

  async deleteNote(id: string, hard = false): Promise<void> {
    await this.withLock(async () => {
      const file = path.join(this.notesDir, `${id}.json`);
      const existing = await this.readJson<NoteItem>(file);
      if (!existing) throw new NotFoundError("Note", id);

      if (hard) {
        await fs.unlink(file).catch(() => {});
      } else {
        existing.deletedAt = new Date().toISOString();
        existing.rev += 1;
        existing.updatedAt = new Date().toISOString();
        await this.atomicWriteJson(file, existing);
      }
    });

    await this.syncViews();
  }

  async clearSamples(): Promise<{ companies: number; tasks: number; notes: number }> {
    return this.withLock(async () => {
      let companiesCount = 0;
      let tasksCount = 0;
      let notesCount = 0;

      const companies = await this.listCompanies({ includeDeleted: true, includeSample: true });
      for (const c of companies) {
        if (c.isSample) {
          await fs.unlink(path.join(this.companiesDir, `${c.id}.json`)).catch(() => {});
          companiesCount++;
        }
      }

      const tasks = await this.listTasks({ includeDeleted: true, includeSample: true });
      for (const t of tasks) {
        if (t.isSample) {
          await fs.unlink(path.join(this.tasksDir, `${t.id}.json`)).catch(() => {});
          tasksCount++;
        }
      }

      const notes = await this.listNotes({ includeDeleted: true, includeSample: true });
      for (const n of notes) {
        if (n.isSample) {
          await fs.unlink(path.join(this.notesDir, `${n.id}.json`)).catch(() => {});
          notesCount++;
        }
      }

      return { companies: companiesCount, tasks: tasksCount, notes: notesCount };
    });
  }

  async syncViews(): Promise<void> {
    await this.ensureDirs();

    const [profile, companies, tasks, notes] = await Promise.all([
      this.getProfile(),
      this.listCompanies({ includeDeleted: false, includeSample: true }),
      this.listTasks({ includeDeleted: false, includeSample: true }),
      this.listNotes({ includeDeleted: false, includeSample: true }),
    ]);

    // 1. context.md
    await this.atomicWriteFile(
      path.join(this.viewsDir, "context.md"),
      formatContextMarkdown(profile, companies, tasks),
    );

    // 2. upcoming.md
    const upcomingItems = buildUpcomingItems(companies, tasks, { includeSample: true });
    await this.atomicWriteFile(
      path.join(this.viewsDir, "upcoming.md"),
      formatUpcomingMarkdown(upcomingItems),
    );

    // 3. notes-index.md
    await this.atomicWriteFile(
      path.join(this.viewsDir, "notes-index.md"),
      formatNotesIndexMarkdown(notes, companies),
    );

    // 4. calendar.ics
    await this.atomicWriteFile(
      path.join(this.viewsDir, "calendar.ics"),
      formatCalendarIcs(companies, tasks),
    );

    // 5. companies/{id}.md
    const activeCompanyIds = new Set(companies.map((c) => c.id));
    for (const company of companies) {
      const mdContent = formatCompanyMarkdown(company, tasks, notes);
      await this.atomicWriteFile(path.join(this.viewCompaniesDir, `${company.id}.md`), mdContent);
    }

    // Clean up stale company md files
    try {
      const existingMds = await fs.readdir(this.viewCompaniesDir);
      for (const file of existingMds) {
        if (!file.endsWith(".md")) continue;
        const id = file.slice(0, -3);
        if (!activeCompanyIds.has(id)) {
          await fs.unlink(path.join(this.viewCompaniesDir, file)).catch(() => {});
        }
      }
    } catch {
      // directory might be empty
    }
  }

  async doctor(): Promise<DoctorReport> {
    const report: DoctorReport = {
      ok: true,
      issues: [],
      stats: {
        companiesCount: 0,
        tasksCount: 0,
        notesCount: 0,
        samplesCount: 0,
      },
    };

    const companies = await this.listCompanies({ includeDeleted: true, includeSample: true });
    const tasks = await this.listTasks({ includeDeleted: true, includeSample: true });
    const notes = await this.listNotes({ includeDeleted: true, includeSample: true });

    report.stats.companiesCount = companies.length;
    report.stats.tasksCount = tasks.length;
    report.stats.notesCount = notes.length;
    report.stats.samplesCount =
      companies.filter((c) => c.isSample).length +
      tasks.filter((t) => t.isSample).length +
      notes.filter((n) => n.isSample).length;

    const companyIds = new Set(companies.map((c) => c.id));

    // Check broken task references
    for (const task of tasks) {
      if (task.companyId && !companyIds.has(task.companyId)) {
        report.ok = false;
        report.issues.push({
          severity: "warning",
          code: "BROKEN_TASK_COMPANY_REF",
          message: `Task '${task.title}' (${task.id}) references missing company ID '${task.companyId}'`,
          fixable: true,
        });
      }
    }

    // Check broken note references
    for (const note of notes) {
      if (note.companyId && !companyIds.has(note.companyId)) {
        report.ok = false;
        report.issues.push({
          severity: "warning",
          code: "BROKEN_NOTE_COMPANY_REF",
          message: `Note '${note.title}' (${note.id}) references missing company ID '${note.companyId}'`,
          fixable: true,
        });
      }
    }

    return report;
  }
}
