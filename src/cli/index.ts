import { defineCommand, runMain } from "citty";
import { companyCommand } from "./commands/company";
import { contextCommand } from "./commands/context";
import { doctorCommand } from "./commands/doctor";
import { esCommand } from "./commands/es";
import { eventCommand } from "./commands/event";
import { initCommand } from "./commands/init";
import { noteCommand } from "./commands/note";
import { profileCommand } from "./commands/profile";
import { sampleCommand } from "./commands/sample";
import { schemaCommand } from "./commands/schema";
import { syncCommand } from "./commands/sync";

const main = defineCommand({
  meta: {
    name: "shukatsu",
    version: "0.2.0",
    description: "AI-Ready Shukatsu Assistant CLI",
  },
  subCommands: {
    init: initCommand,
    context: contextCommand,
    company: companyCommand,
    task: () => import("./commands/task").then((m) => m.taskCommand),
    event: eventCommand,
    es: esCommand,
    note: noteCommand,
    profile: profileCommand,
    sample: sampleCommand,
    doctor: doctorCommand,
    sync: syncCommand,
    schema: schemaCommand,
    ui: () => import("./commands/ui").then((m) => m.uiCommand),
  },
});

runMain(main);
