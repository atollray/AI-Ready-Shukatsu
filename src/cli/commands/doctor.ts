import { defineCommand } from "citty";
import { getStore, outputError, outputJson } from "../util";

export const doctorCommand = defineCommand({
  meta: {
    name: "doctor",
    description: "Diagnose database consistency and integrity",
  },
  args: {
    data: { type: "string" },
    pretty: { type: "boolean", default: false },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const report = await store.doctor();
      outputJson(report, args.pretty);
      if (!report.ok) {
        process.exitCode = 1;
      }
    } catch (err) {
      outputError("DOCTOR_FAILED", (err as Error).message);
    }
  },
});
