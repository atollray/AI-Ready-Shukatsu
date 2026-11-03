import { defineCommand } from "citty";
import { type Company, type CompanyStage, generateId } from "../../core";
import { getStore, outputError, outputJson, readInputJson } from "../util";

const listSubCommand = defineCommand({
  meta: { name: "list", description: "List companies" },
  args: {
    data: { type: "string" },
    includeDeleted: { type: "boolean", default: false },
    includeSample: { type: "boolean", default: true },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const list = await store.listCompanies({
        includeDeleted: args.includeDeleted,
        includeSample: args.includeSample,
      });
      outputJson(list, args.pretty);
    } catch (err) {
      outputError("COMPANY_LIST_FAILED", (err as Error).message);
    }
  },
});

const getSubCommand = defineCommand({
  meta: { name: "get", description: "Get company by ID" },
  args: {
    id: { type: "positional", required: true },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const company = await store.getCompany(args.id);
      if (!company) {
        outputError("COMPANY_NOT_FOUND", `Company not found: ${args.id}`);
        return;
      }
      outputJson(company, args.pretty);
    } catch (err) {
      outputError("COMPANY_GET_FAILED", (err as Error).message);
    }
  },
});

const findSubCommand = defineCommand({
  meta: { name: "find", description: "Find company by name or keyword for duplicate checking" },
  args: {
    query: { type: "positional", required: true },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const q = args.query.toLowerCase().trim();
      const list = await store.listCompanies({ includeDeleted: false, includeSample: true });

      const matches = list.filter((c) => {
        return (
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
        );
      });

      outputJson(matches, args.pretty);
    } catch (err) {
      outputError("COMPANY_FIND_FAILED", (err as Error).message);
    }
  },
});

const addSubCommand = defineCommand({
  meta: { name: "add", description: "Add a new company" },
  args: {
    name: { type: "string", description: "Company name" },
    industry: { type: "string", default: "" },
    headquarters: { type: "string", default: "" },
    stage: { type: "string", default: "researching" },
    track: { type: "string", default: "本選考" },
    interestScore: { type: "string", default: "3" },
    fitScore: { type: "string", default: "3" },
    input: { type: "string", description: "JSON file path containing full company fields" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const inputData = (await readInputJson<Partial<Company>>(args.input)) || {};

      const name = inputData.name || args.name;
      if (!name) {
        outputError("INVALID_ARGUMENTS", "Company name is required (--name or --input)");
        return;
      }

      // Check duplicate by exact name
      const existing = await store.listCompanies({ includeDeleted: false });
      const duplicate = existing.find((c) => c.name.trim() === name.trim());
      if (duplicate) {
        outputError(
          "DUPLICATE_COMPANY",
          `Company with name '${name}' already exists with ID: ${duplicate.id}`,
          "Use 'sk company get <id>' or 'sk company update <id>'",
        );
        return;
      }

      const stage = (inputData.stage || args.stage) as CompanyStage;
      const track = inputData.currentTrack || args.track;
      const now = new Date().toISOString();

      const newCompany: Company = {
        id: generateId("co"),
        rev: 1,
        updatedAt: now,
        isSample: false,
        name,
        industry: inputData.industry ?? args.industry,
        headquarters: inputData.headquarters ?? args.headquarters,
        urls: inputData.urls ?? { careers: "", application: "" },
        tags: inputData.tags ?? [],
        stage,
        currentTrack: track,
        stageHistory: [
          {
            at: now,
            track,
            from: "wishlist" as CompanyStage,
            to: stage,
          },
        ],
        interestScore: inputData.interestScore ?? (Number(args.interestScore) || 3),
        fitScore: inputData.fitScore ?? (Number(args.fitScore) || 3),
        motivation: inputData.motivation ?? "",
        sellingPoints: inputData.sellingPoints ?? "",
        concerns: inputData.concerns ?? "",
        conditions: inputData.conditions ?? "",
        memo: inputData.memo ?? "",
        esEntries: inputData.esEntries ?? [],
        events: inputData.events ?? [],
        contacts: inputData.contacts ?? [],
        documents: inputData.documents ?? [],
      };

      const saved = await store.saveCompany(newCompany);
      outputJson(saved, args.pretty);
    } catch (err) {
      outputError("COMPANY_ADD_FAILED", (err as Error).message);
    }
  },
});

const updateSubCommand = defineCommand({
  meta: { name: "update", description: "Update company details via JSON merge patch file" },
  args: {
    id: { type: "positional", required: true },
    input: { type: "string", description: "JSON file path with patch properties", required: true },
    expectRev: { type: "string", description: "Expected revision for optimistic locking" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const existing = await store.getCompany(args.id);
      if (!existing) {
        outputError("COMPANY_NOT_FOUND", `Company not found: ${args.id}`);
        return;
      }

      const patch = (await readInputJson<Partial<Company>>(args.input)) || {};
      const updated: Company = {
        ...existing,
        ...patch,
        id: existing.id, // cannot change id
      };

      const expectRev = args.expectRev !== undefined ? Number(args.expectRev) : undefined;
      const saved = await store.saveCompany(updated, expectRev);
      outputJson(saved, args.pretty);
    } catch (err) {
      outputError("COMPANY_UPDATE_FAILED", (err as Error).message);
    }
  },
});

const stageSubCommand = defineCommand({
  meta: {
    name: "stage",
    description: "Advance or change company stage with automatic history entry",
  },
  args: {
    id: { type: "positional", required: true },
    stage: { type: "positional", required: true },
    track: { type: "string", description: "Optional new selection track (e.g. 本選考)" },
    at: { type: "string", description: "Optional ISO timestamp (defaults to now)" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const existing = await store.getCompany(args.id);
      if (!existing) {
        outputError("COMPANY_NOT_FOUND", `Company not found: ${args.id}`);
        return;
      }

      const toStage = args.stage as CompanyStage;
      const fromStage = existing.stage;
      const track = args.track || existing.currentTrack;
      const at = args.at || new Date().toISOString();

      const updated: Company = {
        ...existing,
        stage: toStage,
        currentTrack: track,
        stageHistory: [
          ...existing.stageHistory,
          {
            at,
            track,
            from: fromStage,
            to: toStage,
          },
        ],
      };

      const saved = await store.saveCompany(updated);
      outputJson(saved, args.pretty);
    } catch (err) {
      outputError("COMPANY_STAGE_FAILED", (err as Error).message);
    }
  },
});

const deleteSubCommand = defineCommand({
  meta: { name: "delete", description: "Delete company (soft delete by default, or --hard)" },
  args: {
    id: { type: "positional", required: true },
    hard: { type: "boolean", default: false },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      await store.deleteCompany(args.id, args.hard);
      outputJson({ deleted: true, id: args.id, hard: args.hard }, args.pretty);
    } catch (err) {
      outputError("COMPANY_DELETE_FAILED", (err as Error).message);
    }
  },
});

export const companyCommand = defineCommand({
  meta: {
    name: "company",
    description: "Manage companies",
  },
  subCommands: {
    list: listSubCommand,
    get: getSubCommand,
    find: findSubCommand,
    add: addSubCommand,
    update: updateSubCommand,
    stage: stageSubCommand,
    delete: deleteSubCommand,
  },
});
