import { defineCommand } from "citty";
import { type EsEntry, type EsStatus, generateId } from "../../core";
import { getStore, outputError, outputJson, readInputJson } from "../util";

const listSubCommand = defineCommand({
  meta: { name: "list", description: "List ES entries for a company" },
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
      outputJson(company.esEntries, args.pretty);
    } catch (err) {
      outputError("ES_LIST_FAILED", (err as Error).message);
    }
  },
});

const addSubCommand = defineCommand({
  meta: { name: "add", description: "Add ES entry to a company" },
  args: {
    company: { type: "string", required: true, description: "Company ID" },
    title: { type: "string", required: true },
    question: { type: "string", default: "" },
    draft: { type: "string", default: "" },
    status: { type: "string", default: "idea" },
    deadline: { type: "string", default: "" },
    charLimit: { type: "string" },
    input: { type: "string", description: "JSON file path with full ES entry fields" },
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

      const inputData = (await readInputJson<Partial<EsEntry>>(args.input)) || {};
      const newEs: EsEntry = {
        id: generateId("es"),
        title: inputData.title || args.title,
        question: inputData.question ?? args.question,
        draft: inputData.draft ?? args.draft,
        status: (inputData.status || args.status) as EsStatus,
        deadline: inputData.deadline ?? args.deadline,
        track: inputData.track ?? company.currentTrack,
        charLimit: inputData.charLimit ?? (args.charLimit ? Number(args.charLimit) : undefined),
      };

      const updated = {
        ...company,
        esEntries: [...company.esEntries, newEs],
      };
      await store.saveCompany(updated);
      outputJson(newEs, args.pretty);
    } catch (err) {
      outputError("ES_ADD_FAILED", (err as Error).message);
    }
  },
});

const updateSubCommand = defineCommand({
  meta: { name: "update", description: "Update ES entry in a company" },
  args: {
    company: { type: "string", required: true },
    id: { type: "string", required: true, description: "ES entry ID" },
    input: { type: "string", required: true, description: "JSON file with updated ES fields" },
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

      const target = company.esEntries.find((e) => e.id === args.id);
      if (!target) {
        outputError("ES_NOT_FOUND", `ES entry not found: ${args.id}`);
        return;
      }

      const patch = (await readInputJson<Partial<EsEntry>>(args.input)) || {};
      const updatedEs: EsEntry = {
        ...target,
        ...patch,
        id: target.id,
      };

      const updatedCompany = {
        ...company,
        esEntries: company.esEntries.map((e) => (e.id === args.id ? updatedEs : e)),
      };
      await store.saveCompany(updatedCompany);
      outputJson(updatedEs, args.pretty);
    } catch (err) {
      outputError("ES_UPDATE_FAILED", (err as Error).message);
    }
  },
});

const deleteSubCommand = defineCommand({
  meta: { name: "delete", description: "Delete ES entry from a company" },
  args: {
    company: { type: "string", required: true },
    id: { type: "string", required: true, description: "ES entry ID" },
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
        esEntries: company.esEntries.filter((e) => e.id !== args.id),
      };
      await store.saveCompany(updated);
      outputJson({ deleted: true, esId: args.id }, args.pretty);
    } catch (err) {
      outputError("ES_DELETE_FAILED", (err as Error).message);
    }
  },
});

export const esCommand = defineCommand({
  meta: {
    name: "es",
    description: "Manage ES entries",
  },
  subCommands: {
    list: listSubCommand,
    add: addSubCommand,
    update: updateSubCommand,
    delete: deleteSubCommand,
  },
});
