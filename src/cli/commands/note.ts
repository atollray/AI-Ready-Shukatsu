import { defineCommand } from "citty";
import { type NoteItem, generateId } from "../../core";
import { getStore, outputError, outputJson, readInputJson } from "../util";

const listSubCommand = defineCommand({
  meta: { name: "list", description: "List notes" },
  args: {
    company: { type: "string", description: "Filter by company ID" },
    includeDeleted: { type: "boolean", default: false },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      let list = await store.listNotes({
        includeDeleted: args.includeDeleted,
        includeSample: true,
      });

      if (args.company) {
        list = list.filter((n) => n.companyId === args.company);
      }

      outputJson(list, args.pretty);
    } catch (err) {
      outputError("NOTE_LIST_FAILED", (err as Error).message);
    }
  },
});

const addSubCommand = defineCommand({
  meta: { name: "add", description: "Add a note" },
  args: {
    title: { type: "string", required: true },
    content: { type: "string", default: "" },
    company: { type: "string", default: "" },
    date: { type: "string", default: "" },
    input: { type: "string", description: "JSON file with note fields (for multiline content)" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const inputData = (await readInputJson<Partial<NoteItem>>(args.input)) || {};
      const now = new Date().toISOString();

      const newNote: NoteItem = {
        id: generateId("nt"),
        rev: 1,
        updatedAt: now,
        isSample: false,
        title: inputData.title || args.title,
        content: inputData.content ?? args.content,
        companyId: inputData.companyId ?? args.company,
        date: inputData.date ?? args.date ?? now.slice(0, 10),
      };

      const saved = await store.saveNote(newNote);
      outputJson(saved, args.pretty);
    } catch (err) {
      outputError("NOTE_ADD_FAILED", (err as Error).message);
    }
  },
});

const searchSubCommand = defineCommand({
  meta: { name: "search", description: "Search notes by keyword" },
  args: {
    query: { type: "positional", required: true },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const q = args.query.toLowerCase().trim();
      const list = await store.listNotes({ includeDeleted: false, includeSample: true });

      const matches = list.filter((n) => {
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      });

      outputJson(matches, args.pretty);
    } catch (err) {
      outputError("NOTE_SEARCH_FAILED", (err as Error).message);
    }
  },
});

const deleteSubCommand = defineCommand({
  meta: { name: "delete", description: "Delete note" },
  args: {
    id: { type: "positional", required: true },
    hard: { type: "boolean", default: false },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      await store.deleteNote(args.id, args.hard);
      outputJson({ deleted: true, id: args.id, hard: args.hard }, args.pretty);
    } catch (err) {
      outputError("NOTE_DELETE_FAILED", (err as Error).message);
    }
  },
});

export const noteCommand = defineCommand({
  meta: {
    name: "note",
    description: "Manage notes and logs",
  },
  subCommands: {
    list: listSubCommand,
    add: addSubCommand,
    search: searchSubCommand,
    delete: deleteSubCommand,
  },
});
