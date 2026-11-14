import type { CompanyStage, EsStatus, EventKind, TaskState } from "@/core/client";

export interface StageMeta {
  value: CompanyStage;
  label: string;
  shortLabel: string;
  dotColor: string;
  labelClass: string;
}

export const STAGE_LIST: StageMeta[] = [
  {
    value: "wishlist",
    label: "気になる",
    shortLabel: "気になる",
    dotColor: "#6e7781",
    labelClass: "gh-label-neutral",
  },
  {
    value: "researching",
    label: "企業調査中",
    shortLabel: "調査中",
    dotColor: "#0969da",
    labelClass: "gh-label-accent",
  },
  {
    value: "applied",
    label: "応募・ES中",
    shortLabel: "応募・ES",
    dotColor: "#8250df",
    labelClass: "gh-label-done",
  },
  {
    value: "interview",
    label: "面接進行中",
    shortLabel: "面接中",
    dotColor: "#bf8700",
    labelClass: "gh-label-attention",
  },
  {
    value: "offer",
    label: "内定・内々定",
    shortLabel: "内定",
    dotColor: "#1a7f37",
    labelClass: "gh-label-success",
  },
  {
    value: "paused",
    label: "保留",
    shortLabel: "保留",
    dotColor: "#6e7781",
    labelClass: "gh-label-neutral",
  },
  {
    value: "rejected",
    label: "お見送り",
    shortLabel: "お見送り",
    dotColor: "#cf222e",
    labelClass: "gh-label-danger",
  },
];

export const ACTIVE_STAGE_FLOW: CompanyStage[] = [
  "wishlist",
  "researching",
  "applied",
  "interview",
  "offer",
];

export const STAGE_MAP: Record<CompanyStage, StageMeta> = Object.fromEntries(
  STAGE_LIST.map((item) => [item.value, item]),
) as Record<CompanyStage, StageMeta>;

export const ES_STATUS_META: Record<EsStatus, { label: string; labelClass: string }> = {
  idea: { label: "アイデア", labelClass: "gh-label-neutral" },
  draft: { label: "下書き中", labelClass: "gh-label-accent" },
  review: { label: "添削中", labelClass: "gh-label-attention" },
  submitted: { label: "提出済み", labelClass: "gh-label-success" },
};

export const EVENT_KIND_META: Record<EventKind, { label: string; labelClass: string }> = {
  interview: { label: "面接", labelClass: "gh-label-attention" },
  deadline: { label: "締切", labelClass: "gh-label-danger" },
  seminar: { label: "説明会", labelClass: "gh-label-accent" },
  test: { label: "WEBテスト", labelClass: "gh-label-done" },
  internship: { label: "インターン", labelClass: "gh-label-success" },
  obog: { label: "OB/OG訪問", labelClass: "gh-label-accent" },
  other: { label: "その他", labelClass: "gh-label-neutral" },
};

export const TASK_STATE_META: Record<TaskState, { label: string; labelClass: string }> = {
  todo: { label: "未着手", labelClass: "gh-label-neutral" },
  doing: { label: "進行中", labelClass: "gh-label-accent" },
  done: { label: "完了", labelClass: "gh-label-success" },
};

export function formatRelativeDate(dateStr: string): { text: string; urgent: boolean } {
  if (!dateStr) return { text: "", urgent: false };
  const datePart = dateStr.slice(0, 10);
  const target = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(target.getTime())) return { text: dateStr, urgent: false };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `${Math.abs(diffDays)}日超過`, urgent: true };
  if (diffDays === 0) return { text: "今日", urgent: true };
  if (diffDays === 1) return { text: "明日", urgent: true };
  if (diffDays <= 3) return { text: `あと${diffDays}日`, urgent: true };
  if (diffDays <= 14) return { text: `あと${diffDays}日`, urgent: false };
  return { text: datePart, urgent: false };
}
