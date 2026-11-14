import { defineCommand } from "citty";
import { type EventEntry, type EventKind, generateId } from "../../core";
import { getStore, outputError, outputJson, readInputJson } from "../util";

const listSubCommand = defineCommand({
  meta: { name: "list", description: "List events for a company" },
  args: {
    company: { type: "string", required: true, description: "Company ID" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const company = await store.getCompany(args.company);
      if (!company) {
        outputError("COMPANY_NOT_FOUND", `Company not found: ${args.company}`);
        return;
      }
      outputJson(company.events, args.pretty);
    } catch (err) {
      outputError("EVENT_LIST_FAILED", (err as Error).message);
    }
  },
});

const addSubCommand = defineCommand({
  meta: { name: "add", description: "Add event to a company" },
  args: {
    company: { type: "string", required: true, description: "Company ID" },
    title: { type: "string", required: true },
    kind: { type: "string", default: "deadline" },
    start: { type: "string", required: true, description: "Date (YYYY-MM-DD or YYYY-MM-DDTHH:mm)" },
    durationMin: { type: "string" },
    location: { type: "string", default: "" },
    track: { type: "string" },
    notes: { type: "string", default: "" },
    input: {
      type: "string",
      description: "JSON file path containing full event/interview details",
    },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const company = await store.getCompany(args.company);
      if (!company) {
        outputError("COMPANY_NOT_FOUND", `Company not found: ${args.company}`);
        return;
      }

      const inputData = (await readInputJson<Partial<EventEntry>>(args.input)) || {};
      const newEvent: EventEntry = {
        id: generateId("ev"),
        kind: (inputData.kind || args.kind) as EventKind,
        title: inputData.title || args.title,
        start: inputData.start || args.start,
        durationMin:
          inputData.durationMin ?? (args.durationMin ? Number(args.durationMin) : undefined),
        location: inputData.location ?? args.location,
        track: inputData.track ?? args.track ?? company.currentTrack,
        notes: inputData.notes ?? args.notes,
        interview: inputData.interview,
      };

      const updated = {
        ...company,
        events: [...company.events, newEvent],
      };
      await store.saveCompany(updated);
      outputJson(newEvent, args.pretty);
    } catch (err) {
      outputError("EVENT_ADD_FAILED", (err as Error).message);
    }
  },
});

const deleteSubCommand = defineCommand({
  meta: { name: "delete", description: "Delete event from a company" },
  args: {
    company: { type: "string", required: true },
    id: { type: "string", required: true, description: "Event ID" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const company = await store.getCompany(args.company);
      if (!company) {
        outputError("COMPANY_NOT_FOUND", `Company not found: ${args.company}`);
        return;
      }

      const updated = {
        ...company,
        events: company.events.filter((e) => e.id !== args.id),
      };
      await store.saveCompany(updated);
      outputJson({ deleted: true, eventId: args.id }, args.pretty);
    } catch (err) {
      outputError("EVENT_DELETE_FAILED", (err as Error).message);
    }
  },
});

export const eventCommand = defineCommand({
  meta: {
    name: "event",
    description: "Manage events and interviews",
  },
  subCommands: {
    list: listSubCommand,
    add: addSubCommand,
    delete: deleteSubCommand,
  },
});
