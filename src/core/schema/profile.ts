import { z } from "zod";

export const ProfileDataSchema = z.object({
  name: z.string().default(""),
  school: z.string().default(""),
  graduationYear: z.string().default(""),
  desiredRoles: z.array(z.string()).default([]),
  desiredIndustries: z.array(z.string()).default([]),
  domainInterests: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  priorities: z.array(z.string()).default([]),
  workingPreferences: z.string().default(""),
  careerVision: z
    .object({
      shortTerm: z.string().default(""),
      midTerm: z.string().default(""),
      longTerm: z.string().default(""),
    })
    .default({ shortTerm: "", midTerm: "", longTerm: "" }),
  weeklyFocus: z.string().default(""),
  memo: z.string().default(""),
  updatedAt: z.string().default(""),
});
export type ProfileData = z.infer<typeof ProfileDataSchema>;
