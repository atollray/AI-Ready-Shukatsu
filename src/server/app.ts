import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { resolveDataDir } from "../cli/util";
import {
  type Company,
  CompanySchema,
  ConflictError,
  type FsStore,
  NotFoundError,
  type NoteItem,
  NoteItemSchema,
  type ProfileData,
  ProfileDataSchema,
  type TaskItem,
  TaskItemSchema,
} from "../core";
import { storeEvents } from "./watcher";

export function createApp(store: FsStore): Hono {
  const app = new Hono();

  // Error handling middleware
  app.onError((err, c) => {
    if (err instanceof ConflictError) {
      return c.json(
        {
          ok: false,
          error: {
            code: "CONFLICT",
            message: err.message,
            currentRev: err.currentRev,
          },
        },
        409,
      );
    }
    if (err instanceof NotFoundError) {
      return c.json(
        {
          ok: false,
          error: {
            code: "NOT_FOUND",
            message: err.message,
          },
        },
        404,
      );
    }
    console.error("Unhandled server error:", err);
    return c.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err.message,
        },
      },
      500,
    );
  });

  // Health
  app.get("/api/health", (c) => c.json({ ok: true, version: "0.2.0" }));

  // SSE Events stream for real-time file updates
  app.get("/api/events", (c) => {
    return streamSSE(c, async (stream) => {
      const onChange = (data: { timestamp: number }) => {
        stream.writeSSE({
          event: "store-change",
          data: JSON.stringify(data),
        });
      };

      storeEvents.on("change", onChange);

      // Keepalive ping every 15s
      const interval = setInterval(() => {
        stream.writeSSE({ event: "ping", data: "keepalive" });
      }, 15000);

      stream.onAbort(() => {
        clearInterval(interval);
        storeEvents.off("change", onChange);
      });

      // Keep stream open
      await new Promise(() => {});
    });
  });

  // Workspace Full Snapshot (for initial UI load)
  app.get("/api/workspace", async (c) => {
    const [meta, profile, companies, tasks, notes] = await Promise.all([
      store.getMeta(),
      store.getProfile(),
      store.listCompanies({ includeDeleted: false, includeSample: true }),
      store.listTasks({ includeDeleted: false, includeSample: true }),
      store.listNotes({ includeDeleted: false, includeSample: true }),
    ]);

    return c.json({
      ok: true,
      data: {
        meta,
        profile,
        companies,
        tasks,
        notes,
      },
    });
  });

  // Profile API
  app.get("/api/profile", async (c) => {
    const profile = await store.getProfile();
    return c.json({ ok: true, data: profile });
  });

  app.patch("/api/profile", zValidator("json", ProfileDataSchema.partial()), async (c) => {
    const patch = c.req.valid("json");
    const updated = await store.updateProfile(patch);
    return c.json({ ok: true, data: updated });
  });

  // Companies API
  app.get("/api/companies", async (c) => {
    const companies = await store.listCompanies({
      includeDeleted: false,
      includeSample: true,
    });
    return c.json({ ok: true, data: companies });
  });

  app.get("/api/companies/:id", async (c) => {
    const company = await store.getCompany(c.req.param("id"));
    if (!company) {
      throw new NotFoundError("Company", c.req.param("id"));
    }
    return c.json({ ok: true, data: company });
  });

  app.post("/api/companies", zValidator("json", CompanySchema), async (c) => {
    const company = c.req.valid("json");
    const saved = await store.saveCompany(company);
    return c.json({ ok: true, data: saved }, 201);
  });

  app.patch(
    "/api/companies/:id",
    zValidator(
      "json",
      z.object({
        company: CompanySchema.partial(),
        expectRev: z.number().optional(),
      }),
    ),
    async (c) => {
      const { company: patch, expectRev } = c.req.valid("json");
      const id = c.req.param("id");
      const existing = await store.getCompany(id);
      if (!existing) {
        throw new NotFoundError("Company", id);
      }

      const merged: Company = {
        ...existing,
        ...patch,
        id, // cannot modify id
      };

      const saved = await store.saveCompany(merged, expectRev);
      return c.json({ ok: true, data: saved });
    },
  );

  app.delete("/api/companies/:id", async (c) => {
    const id = c.req.param("id");
    const hard = c.req.query("hard") === "true";
    await store.deleteCompany(id, hard);
    return c.json({ ok: true, data: { deleted: true, id } });
  });

  // Tasks API
  app.get("/api/tasks", async (c) => {
    const tasks = await store.listTasks({
      includeDeleted: false,
      includeSample: true,
    });
    return c.json({ ok: true, data: tasks });
  });

  app.post("/api/tasks", zValidator("json", TaskItemSchema), async (c) => {
    const task = c.req.valid("json");
    const saved = await store.saveTask(task);
    return c.json({ ok: true, data: saved }, 201);
  });

  app.patch(
    "/api/tasks/:id",
    zValidator(
      "json",
      z.object({
        task: TaskItemSchema.partial(),
        expectRev: z.number().optional(),
      }),
    ),
    async (c) => {
      const { task: patch, expectRev } = c.req.valid("json");
      const id = c.req.param("id");
      const existing = await store.getTask(id);
      if (!existing) {
        throw new NotFoundError("Task", id);
      }

      const merged: TaskItem = {
        ...existing,
        ...patch,
        id,
      };

      const saved = await store.saveTask(merged, expectRev);
      return c.json({ ok: true, data: saved });
    },
  );

  app.delete("/api/tasks/:id", async (c) => {
    const id = c.req.param("id");
    const hard = c.req.query("hard") === "true";
    await store.deleteTask(id, hard);
    return c.json({ ok: true, data: { deleted: true, id } });
  });

  // Notes API
  app.get("/api/notes", async (c) => {
    const notes = await store.listNotes({
      includeDeleted: false,
      includeSample: true,
    });
    return c.json({ ok: true, data: notes });
  });

  app.post("/api/notes", zValidator("json", NoteItemSchema), async (c) => {
    const note = c.req.valid("json");
    const saved = await store.saveNote(note);
    return c.json({ ok: true, data: saved }, 201);
  });

  app.patch(
    "/api/notes/:id",
    zValidator(
      "json",
      z.object({
        note: NoteItemSchema.partial(),
        expectRev: z.number().optional(),
      }),
    ),
    async (c) => {
      const { note: patch, expectRev } = c.req.valid("json");
      const id = c.req.param("id");
      const existing = await store.getNote(id);
      if (!existing) {
        throw new NotFoundError("Note", id);
      }

      const merged: NoteItem = {
        ...existing,
        ...patch,
        id,
      };

      const saved = await store.saveNote(merged, expectRev);
      return c.json({ ok: true, data: saved });
    },
  );

  app.delete("/api/notes/:id", async (c) => {
    const id = c.req.param("id");
    const hard = c.req.query("hard") === "true";
    await store.deleteNote(id, hard);
    return c.json({ ok: true, data: { deleted: true, id } });
  });

  // Clear Samples API
  app.post("/api/sample/clear", async (c) => {
    const result = await store.clearSamples();
    return c.json({ ok: true, data: result });
  });

  return app;
}
