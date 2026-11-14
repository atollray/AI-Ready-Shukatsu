import { z } from "zod";
import {
  CompanyStageSchema,
  EsStatusSchema,
  EventKindSchema,
  IsoDateTimeSchema,
  ScoreSchema,
} from "./common";

export const StageHistoryEntrySchema = z.object({
  at: z.string(),
  track: z.string().default("本選考"),
  from: CompanyStageSchema,
  to: CompanyStageSchema,
});
export type StageHistoryEntry = z.infer<typeof StageHistoryEntrySchema>;

export const UrlsSchema = z.object({
  careers: z.string().default(""),
  application: z.string().default(""),
});
export type Urls = z.infer<typeof UrlsSchema>;

export const InterviewDetailsSchema = z.object({
  round: z.string().default(""),
  format: z.string().default(""),
  questions: z.string().default(""),
  reflections: z.string().default(""),
  outcome: z.string().default(""),
});
export type InterviewDetails = z.infer<typeof InterviewDetailsSchema>;

export const EventEntrySchema = z.object({
  id: z.string(),
  kind: EventKindSchema.default("deadline"),
  title: z.string().default(""),
  start: z.string().default(""), // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  durationMin: z.number().int().positive().optional(),
  location: z.string().default(""),
  track: z.string().optional(),
  notes: z.string().default(""),
  interview: InterviewDetailsSchema.optional(),
});
export type EventEntry = z.infer<typeof EventEntrySchema>;

export const EsEntrySchema = z.object({
  id: z.string(),
  title: z.string().default(""),
  question: z.string().default(""),
  draft: z.string().default(""),
  status: EsStatusSchema.default("idea"),
  deadline: z.string().default(""),
  track: z.string().optional(),
  charLimit: z.number().int().positive().optional(),
});
export type EsEntry = z.infer<typeof EsEntrySchema>;

export const ContactEntrySchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  role: z.string().default(""),
  channel: z.string().default(""),
  email: z.string().default(""),
  notes: z.string().default(""),
});
export type ContactEntry = z.infer<typeof ContactEntrySchema>;

export const DocumentEntrySchema = z.object({
  id: z.string(),
  label: z.string().default(""),
  path: z.string().default(""),
  notes: z.string().default(""),
});
export type DocumentEntry = z.infer<typeof DocumentEntrySchema>;

export const CompanySchema = z.object({
  id: z.string(),
  rev: z.number().int().min(1).default(1),
  updatedAt: z.string(),
  isSample: z.boolean().default(false),
  name: z.string().min(1, "企業名は必須です"),
  industry: z.string().default(""),
  headquarters: z.string().default(""),
  urls: UrlsSchema.default({ careers: "", application: "" }),
  tags: z.array(z.string()).default([]),
  stage: CompanyStageSchema.default("researching"),
  currentTrack: z.string().default("本選考"),
  stageHistory: z.array(StageHistoryEntrySchema).default([]),
  interestScore: ScoreSchema,
  fitScore: ScoreSchema,
  motivation: z.string().default(""),
  sellingPoints: z.string().default(""),
  concerns: z.string().default(""),
  conditions: z.string().default(""),
  memo: z.string().default(""),
  esEntries: z.array(EsEntrySchema).default([]),
  events: z.array(EventEntrySchema).default([]),
  contacts: z.array(ContactEntrySchema).default([]),
  documents: z.array(DocumentEntrySchema).default([]),
  deletedAt: z.string().nullable().optional(),
});
export type Company = z.infer<typeof CompanySchema>;
