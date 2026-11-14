import type { UpcomingItem } from "../domain/upcoming";

export function formatUpcomingMarkdown(items: UpcomingItem[]): string {
  if (items.length === 0) {
    return "# 直近の予定・締切\n\n- 現在、直近の予定はありません。\n";
  }

  const lines = items.map((item) => {
    const loc = item.location ? ` | 場所: ${item.location}` : "";
    const note = item.notes ? ` (${item.notes.replace(/\n/g, " ")})` : "";
    return `- ${item.date} | ${item.companyName} | ${item.title}${loc}${note}`;
  });

  return `# 直近の予定・締切

${lines.join("\n")}
`;
}
