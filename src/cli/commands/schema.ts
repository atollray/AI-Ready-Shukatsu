import { defineCommand } from "citty";
import {
  CompanySchema,
  EsEntrySchema,
  EventEntrySchema,
  NoteItemSchema,
  ProfileDataSchema,
  TaskItemSchema,
} from "../../core";
import { outputJson } from "../util";

export const schemaCommand = defineCommand({
  meta: {
    name: "schema",
    description: "Print field definitions for companies, tasks, notes, etc.",
  },
  args: {
    entity: {
      type: "positional",
      description: "Entity type (company, task, note, profile, event, es)",
      default: "all",
    },
    pretty: { type: "boolean", default: true },
  },
  run({ args }) {
    const schemas: Record<string, unknown> = {
      company: {
        id: "string (e.g. co_1234abcd)",
        name: "string (required)",
        industry: "string",
        headquarters: "string",
        urls: { careers: "string", application: "string" },
        tags: "string[]",
        stage: "wishlist | researching | applied | interview | offer | paused | rejected",
        currentTrack: "string (e.g. 本選考, 早期選考, 夏インターン)",
        interestScore: "number (1-5)",
        fitScore: "number (1-5)",
        motivation: "string",
        sellingPoints: "string",
        concerns: "string",
        conditions: "string",
        memo: "string",
      },
      task: {
        id: "string (e.g. tk_1234abcd)",
        title: "string (required)",
        state: "todo | doing | done",
        due: "string (YYYY-MM-DD)",
        companyId: "string (optional)",
        notes: "string",
      },
      note: {
        id: "string (e.g. nt_1234abcd)",
        title: "string (required)",
        date: "string (YYYY-MM-DD)",
        companyId: "string (optional)",
        content: "string",
      },
      profile: {
        name: "string",
        school: "string",
        graduationYear: "string",
        desiredRoles: "string[]",
        desiredIndustries: "string[]",
        domainInterests: "string[]",
        strengths: "string[]",
        weeklyFocus: "string",
        memo: "string",
      },
      event: {
        id: "string (e.g. ev_1234abcd)",
        kind: "deadline | seminar | internship | interview | test | obog | other",
        title: "string",
        start: "string (YYYY-MM-DD or YYYY-MM-DDTHH:mm)",
        durationMin: "number (optional)",
        location: "string",
        track: "string (optional)",
        notes: "string",
        interview: {
          round: "string",
          format: "string",
          questions: "string",
          reflections: "string",
          outcome: "string",
        },
      },
      es: {
        id: "string (e.g. es_1234abcd)",
        title: "string",
        question: "string",
        draft: "string",
        status: "idea | draft | review | submitted",
        deadline: "string (YYYY-MM-DD)",
        track: "string (optional)",
        charLimit: "number (optional)",
      },
    };

    if (args.entity !== "all" && schemas[args.entity]) {
      outputJson(schemas[args.entity], args.pretty);
    } else {
      outputJson(schemas, args.pretty);
    }
  },
});
