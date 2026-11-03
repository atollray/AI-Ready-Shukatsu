import { z } from "zod";
import { TaskStateSchema } from "./common";

export const TaskItemSchema = z.object({
  id: z.string(),
  rev: z.number().int().min(1).default(1),
  updatedAt: z.string(),
  isSample: z.boolean().default(false),
  title: z.string().min(1, "タスクタイトルは必須です"),
  state: TaskStateSchema.default("todo"),
  due: z.string().default(""), // YYYY-MM-DD
  companyId: z.string().default(""),
  notes: z.string().default(""),
  deletedAt: z.string().nullable().optional(),
});
export type TaskItem = z.infer<typeof TaskItemSchema>;
