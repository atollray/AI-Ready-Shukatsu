import { defineCommand } from "citty";
import { type TaskItem, type TaskState, generateId } from "../../core";
import { getStore, outputError, outputJson } from "../util";

const listSubCommand = defineCommand({
  meta: { name: "list", description: "List tasks" },
  args: {
    company: { type: "string", description: "Filter by company ID" },
    openOnly: { type: "boolean", default: false, description: "Show only open (todo/doing) tasks" },
    includeDeleted: { type: "boolean", default: false },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      let list = await store.listTasks({
        includeDeleted: args.includeDeleted,
        includeSample: true,
      });

      if (args.company) {
        list = list.filter((t) => t.companyId === args.company);
      }
      if (args.openOnly) {
        list = list.filter((t) => t.state !== "done");
      }

      outputJson(list, args.pretty);
    } catch (err) {
      outputError("TASK_LIST_FAILED", (err as Error).message);
    }
  },
});

const addSubCommand = defineCommand({
  meta: { name: "add", description: "Add a new task" },
  args: {
    title: { type: "string", required: true, description: "Task title" },
    due: { type: "string", default: "", description: "Due date (YYYY-MM-DD)" },
    company: { type: "string", default: "", description: "Related company ID" },
    notes: { type: "string", default: "", description: "Task notes or details" },
    state: { type: "string", default: "todo", description: "Initial state (todo/doing/done)" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const now = new Date().toISOString();

      const newTask: TaskItem = {
        id: generateId("tk"),
        rev: 1,
        updatedAt: now,
        isSample: false,
        title: args.title,
        state: args.state as TaskState,
        due: args.due,
        companyId: args.company,
        notes: args.notes,
      };

      const saved = await store.saveTask(newTask);
      outputJson(saved, args.pretty);
    } catch (err) {
      outputError("TASK_ADD_FAILED", (err as Error).message);
    }
  },
});

const updateSubCommand = defineCommand({
  meta: { name: "update", description: "Update an existing task" },
  args: {
    id: { type: "positional", required: true },
    title: { type: "string" },
    state: { type: "string" },
    due: { type: "string" },
    notes: { type: "string" },
    company: { type: "string" },
    expectRev: { type: "string" },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const existing = await store.getTask(args.id);
      if (!existing) {
        outputError("TASK_NOT_FOUND", `Task not found: ${args.id}`);
        return;
      }

      const updated: TaskItem = {
        ...existing,
        title: args.title ?? existing.title,
        state: (args.state as TaskState) ?? existing.state,
        due: args.due ?? existing.due,
        notes: args.notes ?? existing.notes,
        companyId: args.company ?? existing.companyId,
      };

      const expectRev = args.expectRev !== undefined ? Number(args.expectRev) : undefined;
      const saved = await store.saveTask(updated, expectRev);
      outputJson(saved, args.pretty);
    } catch (err) {
      outputError("TASK_UPDATE_FAILED", (err as Error).message);
    }
  },
});

const doneSubCommand = defineCommand({
  meta: { name: "done", description: "Mark task as done" },
  args: {
    id: { type: "positional", required: true },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const existing = await store.getTask(args.id);
      if (!existing) {
        outputError("TASK_NOT_FOUND", `Task not found: ${args.id}`);
        return;
      }

      const saved = await store.saveTask({
        ...existing,
        state: "done",
      });
      outputJson(saved, args.pretty);
    } catch (err) {
      outputError("TASK_DONE_FAILED", (err as Error).message);
    }
  },
});

const deleteSubCommand = defineCommand({
  meta: { name: "delete", description: "Delete task" },
  args: {
    id: { type: "positional", required: true },
    hard: { type: "boolean", default: false },
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      await store.deleteTask(args.id, args.hard);
      outputJson({ deleted: true, id: args.id, hard: args.hard }, args.pretty);
    } catch (err) {
      outputError("TASK_DELETE_FAILED", (err as Error).message);
    }
  },
});

export const taskCommand = defineCommand({
  meta: {
    name: "task",
    description: "Manage tasks",
  },
  subCommands: {
    list: listSubCommand,
    add: addSubCommand,
    update: updateSubCommand,
    done: doneSubCommand,
    delete: deleteSubCommand,
  },
});
