import { deriveNextAction } from "../domain/next-action";
import { calculateStageCounts, getTopScoredCompanies } from "../domain/stats";
import { buildUpcomingItems } from "../domain/upcoming";
import type { Company, ProfileData, TaskItem } from "../schema";

export function formatContextMarkdown(
  profile: ProfileData,
  companies: Company[],
  tasks: TaskItem[],
  options: { includeSample?: boolean } = {},
): string {
  const includeSample = options.includeSample ?? false;
  const filteredCompanies = includeSample ? companies : companies.filter((c) => !c.isSample);
  const activeCompanies = filteredCompanies.filter((c) => !c.deletedAt);

  const stageCounts = calculateStageCounts(activeCompanies);
  const topCompanies = getTopScoredCompanies(activeCompanies, 5, includeSample);
  const upcoming = buildUpcomingItems(activeCompanies, tasks, {
    includeSample,
    limit: 6,
  });

  const stageLines = Object.entries(stageCounts)
    .map(([stage, count]) => `- ${stage}: ${count}`)
    .join("\n");

  const topLines = topCompanies.length
    ? topCompanies
        .map((c) => {
          const next = deriveNextAction(c.id, tasks);
          return `- ${c.name} (志望度:${c.interestScore}, マッチ度:${c.fitScore}, ステージ:${c.stage}) | 次: ${next || "未設定"}`;
        })
        .join("\n")
    : "- 登録企業なし";

  const upcomingLines = upcoming.length
    ? upcoming.map((u) => `- ${u.date} | ${u.companyName} | ${u.title}`).join("\n")
    : "- 直近の予定・タスクなし";

  return `# 就活意思決定コンテキスト (AI-Ready Context)

## プロフィール概要
- 氏名: ${profile.name || "未設定"}
- 大学/専攻: ${profile.school || "未設定"} (卒業年: ${profile.graduationYear || "未設定"})
- 志望職種: ${profile.desiredRoles.join(", ") || "未設定"}
- 志望業界: ${profile.desiredIndustries.join(", ") || "未設定"}
- 強み: ${profile.strengths.join(", ") || "未設定"}
- 今週のフォーカス:
${
  profile.weeklyFocus
    ? profile.weeklyFocus
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n")
    : "  未設定"
}

## 選考状況サマリー
${stageLines}

## 高志望度・マッチ企業 (Top 5)
${topLines}

## 直近の期日・タスク (Upcoming)
${upcomingLines}

---
*注: このファイルはデータ更新時に自動生成されます。手動で編集しないでください。*
`;
}
