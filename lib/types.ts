export type CompanyStage =
  | "wishlist"
  | "researching"
  | "es"
  | "applied"
  | "interview"
  | "offer"
  | "paused"
  | "rejected";

export type Priority = "high" | "medium" | "low";
export type TaskState = "todo" | "doing" | "done";
export type EsStatus = "idea" | "draft" | "review" | "submitted";
export type EventType =
  | "deadline"
  | "seminar"
  | "internship"
  | "interview"
  | "test"
  | "obog"
  | "other";

export interface ProfileData {
  name: string;
  school: string;
  graduationYear: string;
  desiredRoles: string[];
  desiredIndustries: string[];
  domainInterests: string[];
  strengths: string[];
  priorities: string[];
  workingPreferences: string;
  careerVision: {
    shortTerm: string;
    midTerm: string;
    longTerm: string;
  };
  weeklyFocus: string;
  memo: string;
}

export interface TaskItem {
  id: string;
  title: string;
  state: TaskState;
  dueDate: string;
  relatedCompanyId: string;
  notes: string;
}

export interface EsEntry {
  id: string;
  title: string;
  question: string;
  draft: string;
  status: EsStatus;
  deadline: string;
}

export interface CompanyEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  location: string;
  notes: string;
}

export interface ContactEntry {
  id: string;
  name: string;
  role: string;
  channel: string;
  email: string;
  notes: string;
}

export interface InterviewEntry {
  id: string;
  round: string;
  date: string;
  format: string;
  outcome: string;
  questions: string;
  reflections: string;
}

export interface DocumentEntry {
  id: string;
  label: string;
  path: string;
  notes: string;
}

export interface CompanyRecord {
  id: string;
  slug: string;
  name: string;
  industry: string;
  stage: CompanyStage;
  priority: Priority;
  interestScore: number;
  fitScore: number;
  applicationUrl: string;
  careersUrl: string;
  headquarters: string;
  tags: string[];
  motivation: string;
  sellingPoints: string;
  concerns: string;
  conditions: string;
  nextAction: string;
  notes: string;
  updatedAt: string;
  esEntries: EsEntry[];
  events: CompanyEvent[];
  contacts: ContactEntry[];
  interviews: InterviewEntry[];
  documents: DocumentEntry[];
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  relatedCompanyId: string;
  content: string;
}

export interface WorkspaceData {
  version: number;
  updatedAt: string;
  profile: ProfileData;
  tasks: TaskItem[];
  companies: CompanyRecord[];
  journalEntries: JournalEntry[];
}
