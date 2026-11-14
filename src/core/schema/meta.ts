import { z } from "zod";

export const MetaDataSchema = z.object({
  schemaVersion: z.literal(2).default(2),
  updatedAt: z.string(),
});
export type MetaData = z.infer<typeof MetaDataSchema>;
