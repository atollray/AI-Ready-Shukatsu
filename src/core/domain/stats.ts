import type { Company, CompanyStage } from "../schema";

export function calculateStageCounts(companies: Company[]): Record<CompanyStage, number> {
  const counts: Record<CompanyStage, number> = {
    wishlist: 0,
    researching: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    paused: 0,
    rejected: 0,
  };

  for (const c of companies) {
    if (c.deletedAt) continue;
    counts[c.stage] = (counts[c.stage] || 0) + 1;
  }

  return counts;
}

export function getTopScoredCompanies(
  companies: Company[],
  limit = 5,
  includeSample = true,
): Company[] {
  return companies
    .filter((c) => !c.deletedAt && (includeSample || !c.isSample))
    .sort((a, b) => {
      const scoreA = a.interestScore + a.fitScore;
      const scoreB = b.interestScore + b.fitScore;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, limit);
}

export function daysSince(isoDate: string): number {
  const time = Date.parse(isoDate);
  if (Number.isNaN(time)) return 0;
  const diff = Date.now() - time;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}
