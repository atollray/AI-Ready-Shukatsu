import { defineCommand } from "citty";
import { deriveNextAction } from "../../core/domain/next-action";
import { calculateStageCounts, getTopScoredCompanies } from "../../core/domain/stats";
import { buildUpcomingItems } from "../../core/domain/upcoming";
import { getStore, outputError, outputJson } from "../util";

export const contextCommand = defineCommand({
  meta: {
    name: "context",
    description: "Get structured context for AI agents or overview",
  },
  args: {
    data: {
      type: "string",
      description: "Custom data directory",
    },
    company: {
      type: "string",
      description: "Optional specific company ID to focus on",
    },
    sample: {
      type: "boolean",
      description: "Include sample data in context",
      default: false,
    },
    pretty: {
      type: "boolean",
      description: "Pretty print JSON output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const store = await getStore(args.data);
      const [profile, companies, tasks] = await Promise.all([
        store.getProfile(),
        store.listCompanies({ includeDeleted: false, includeSample: args.sample }),
        store.listTasks({ includeDeleted: false, includeSample: args.sample }),
      ]);

      const stageCounts = calculateStageCounts(companies);
      const topCompanies = getTopScoredCompanies(companies, 5, args.sample).map((c) => ({
        id: c.id,
        name: c.name,
        stage: c.stage,
        currentTrack: c.currentTrack,
        interestScore: c.interestScore,
        fitScore: c.fitScore,
        nextAction: deriveNextAction(c.id, tasks),
      }));

      const upcoming = buildUpcomingItems(companies, tasks, {
        includeSample: args.sample,
        limit: 10,
      });

      let targetCompany = null;
      if (args.company) {
        targetCompany = await store.getCompany(args.company);
      }

      outputJson(
        {
          profile: {
            name: profile.name,
            school: profile.school,
            desiredRoles: profile.desiredRoles,
            desiredIndustries: profile.desiredIndustries,
            strengths: profile.strengths,
            weeklyFocus: profile.weeklyFocus,
          },
          stageCounts,
          topCompanies,
          upcoming,
          targetCompany,
        },
        args.pretty,
      );
    } catch (err) {
      outputError("CONTEXT_FAILED", (err as Error).message);
    }
  },
});
