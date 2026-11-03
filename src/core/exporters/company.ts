import { deriveNextAction } from "../domain/next-action";
import type { Company, NoteItem, TaskItem } from "../schema";

export function formatCompanyMarkdown(
  company: Company,
  tasks: TaskItem[],
  notes: NoteItem[],
): string {
  const nextAction = deriveNextAction(company.id, tasks);
  const openTasks = tasks
    .filter((t) => t.companyId === company.id && t.state !== "done" && !t.deletedAt)
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));

  const relatedNotes = notes
    .filter((n) => n.companyId === company.id && !n.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date));

  const historyLines = company.stageHistory.length
    ? company.stageHistory
        .map((h) => `- ${h.at.slice(0, 10)} | [${h.track}] ${h.from} → ${h.to}`)
        .join("\n")
    : "- 履歴なし";

  const esLines = company.esEntries.length
    ? company.esEntries
        .map((es) => `- ${es.title} | ${es.status} | 締切: ${es.deadline || "未設定"}`)
        .join("\n")
    : "- なし";

  const eventLines = company.events.length
    ? company.events
        .map((ev) => {
          const round = ev.interview?.round ? ` (${ev.interview.round})` : "";
          const outcome = ev.interview?.outcome ? ` [結果: ${ev.interview.outcome}]` : "";
          return `- ${ev.start || "日程未定"} | [${ev.kind}] ${ev.title}${round}${outcome} | ${ev.location || "場所未設定"}`;
        })
        .join("\n")
    : "- なし";

  const taskLines = openTasks.length
    ? openTasks.map((t) => `- ${t.due || "期限未定"} | [${t.state}] ${t.title}`).join("\n")
    : "- なし";

  const noteLines = relatedNotes.length
    ? relatedNotes.map((n) => `- ${n.date || "日付未設定"} | ${n.title}`).join("\n")
    : "- なし";

  const contactLines = company.contacts.length
    ? company.contacts
        .map((c) => `- ${c.name} (${c.role || "社員"}) | ${c.email || c.channel || ""}`)
        .join("\n")
    : "- なし";

  return `# ${company.name}

## 基本情報
- ID: ${company.id}
- ステージ: ${company.stage} (選考段階: ${company.currentTrack})
- 業界: ${company.industry || "未入力"}
- 本社所在地: ${company.headquarters || "未入力"}
- 志望度: ${company.interestScore}/5 | マッチ度: ${company.fitScore}/5
- 次のアクション: ${nextAction || "未設定"}
- 採用URL: ${company.urls.careers || "未入力"}
- 応募URL: ${company.urls.application || "未入力"}
- タグ: ${company.tags.join(", ") || "なし"}

## 志望動機・下書き
${company.motivation || "未入力"}

## 企業の強み・魅力
${company.sellingPoints || "未入力"}

## 懸念点
${company.concerns || "未入力"}

## 待遇・勤務条件
${company.conditions || "未入力"}

## 社内メモ
${company.memo || "未入力"}

## 選考ステージ履歴
${historyLines}

## エントリーシート (ES)
${esLines}

## イベント・面接
${eventLines}

## 未完了タスク
${taskLines}

## 関連ノート
${noteLines}

## 連絡先
${contactLines}
`;
}
