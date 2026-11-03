import { z } from "zod";

export const NoteItemSchema = z.object({
  id: z.string(),
  rev: z.number().int().min(1).default(1),
  updatedAt: z.string(),
  isSample: z.boolean().default(false),
  date: z.string().default(""), // YYYY-MM-DD
  title: z.string().min(1, "ノートタイトルは必須です"),
  companyId: z.string().default(""),
  content: z.string().default(""),
  deletedAt: z.string().nullable().optional(),
});
export type NoteItem = z.infer<typeof NoteItemSchema>;
