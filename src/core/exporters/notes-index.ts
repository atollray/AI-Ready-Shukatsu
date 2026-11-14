import type { Company, NoteItem } from "../schema";

export function formatNotesIndexMarkdown(notes: NoteItem[], companies: Company[]): string {
  const companyMap = new Map(companies.map((c) => [c.id, c.name]));
  const activeNotes = notes
    .filter((n) => !n.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (activeNotes.length === 0) {
    return "# ノート一覧\n\n- ノートはありません。\n";
  }

  const lines = activeNotes.map((note) => {
    const company = note.companyId ? companyMap.get(note.companyId) || "不明な企業" : "共通";
    const snippet = note.content.replace(/\s+/g, " ").trim().slice(0, 100);
    return `- ${note.date || "日付未定"} | [${company}] ${note.title} — ${snippet}...`;
  });

  return `# ノート一覧・検索インデックス

${lines.join("\n")}
`;
}
