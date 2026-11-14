import type { Company, MetaData, NoteItem, ProfileData, TaskItem } from "../schema";

export class ConflictError extends Error {
  readonly currentRev: number;
  readonly entityId: string;

  constructor(entityId: string, currentRev: number, message = "Conflict detected") {
    super(message);
    this.name = "ConflictError";
    this.entityId = entityId;
    this.currentRev = currentRev;
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`);
    this.name = "NotFoundError";
  }
}

export interface DoctorIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  fixable: boolean;
}

export interface DoctorReport {
  ok: boolean;
  issues: DoctorIssue[];
  stats: {
    companiesCount: number;
    tasksCount: number;
    notesCount: number;
    samplesCount: number;
  };
}

export interface Store {
  init(options?: { sample?: boolean }): Promise<void>;

  getMeta(): Promise<MetaData>;

  getProfile(): Promise<ProfileData>;
  updateProfile(patch: Partial<ProfileData>): Promise<ProfileData>;

  listCompanies(filter?: { includeDeleted?: boolean; includeSample?: boolean }): Promise<Company[]>;
  getCompany(id: string): Promise<Company | null>;
  saveCompany(company: Company, expectRev?: number): Promise<Company>;
  deleteCompany(id: string, hard?: boolean): Promise<void>;

  listTasks(filter?: { includeDeleted?: boolean; includeSample?: boolean }): Promise<TaskItem[]>;
  getTask(id: string): Promise<TaskItem | null>;
  saveTask(task: TaskItem, expectRev?: number): Promise<TaskItem>;
  deleteTask(id: string, hard?: boolean): Promise<void>;

  listNotes(filter?: { includeDeleted?: boolean; includeSample?: boolean }): Promise<NoteItem[]>;
  getNote(id: string): Promise<NoteItem | null>;
  saveNote(note: NoteItem, expectRev?: number): Promise<NoteItem>;
  deleteNote(id: string, hard?: boolean): Promise<void>;

  clearSamples(): Promise<{ companies: number; tasks: number; notes: number }>;
  syncViews(): Promise<void>;
  doctor(): Promise<DoctorReport>;
}
