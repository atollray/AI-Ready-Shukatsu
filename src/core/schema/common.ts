import { z } from "zod";

export function generateId(prefix: "co" | "ev" | "es" | "tk" | "nt" | "ct" | "dc"): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${prefix}_${hex}`;
  }
  const hex = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${hex}`;
}

export const IsoDateTimeSchema = z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
  message: "Valid ISO date-time string required",
});

export const ScoreSchema = z.number().int().min(1).max(5).default(3);

export const CompanyStageSchema = z.enum([
  "wishlist",
  "researching",
  "applied",
  "interview",
  "offer",
  "paused",
  "rejected",
]);
export type CompanyStage = z.infer<typeof CompanyStageSchema>;

export const TaskStateSchema = z.enum(["todo", "doing", "done"]);
export type TaskState = z.infer<typeof TaskStateSchema>;

export const EsStatusSchema = z.enum(["idea", "draft", "review", "submitted"]);
export type EsStatus = z.infer<typeof EsStatusSchema>;

export const EventKindSchema = z.enum([
  "deadline",
  "seminar",
  "internship",
  "interview",
  "test",
  "obog",
  "other",
]);
export type EventKind = z.infer<typeof EventKindSchema>;
