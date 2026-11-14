import { defineCommand } from "citty";
import type { ProfileData } from "../../core";
import { getStore, outputError, outputJson, readInputJson } from "../util";

const getSubCommand = defineCommand({
  meta: { name: "get", description: "Get profile" },
  args: {
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const profile = await store.getProfile();
      outputJson(profile, args.pretty);
    } catch (err) {
      outputError("PROFILE_GET_FAILED", (err as Error).message);
    }
  },
});

const updateSubCommand = defineCommand({
  meta: { name: "update", description: "Update profile via JSON file or parameters" },
  args: {
    input: { type: "string", description: "JSON file with profile patch" },
    name: { type: "string" },
    school: { type: "string" },
    graduationYear: { type: "string" },
    weeklyFocus: { type: "string" },
    memo: { type: "string" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const inputData = (await readInputJson<Partial<ProfileData>>(args.input)) || {};

      const patch: Partial<ProfileData> = {
        ...inputData,
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.school !== undefined ? { school: args.school } : {}),
        ...(args.graduationYear !== undefined ? { graduationYear: args.graduationYear } : {}),
        ...(args.weeklyFocus !== undefined ? { weeklyFocus: args.weeklyFocus } : {}),
        ...(args.memo !== undefined ? { memo: args.memo } : {}),
      };

      const updated = await store.updateProfile(patch);
      outputJson(updated, args.pretty);
    } catch (err) {
      outputError("PROFILE_UPDATE_FAILED", (err as Error).message);
    }
  },
});

export const profileCommand = defineCommand({
  meta: {
    name: "profile",
    description: "Manage candidate profile",
  },
  subCommands: {
    get: getSubCommand,
    update: updateSubCommand,
  },
});
