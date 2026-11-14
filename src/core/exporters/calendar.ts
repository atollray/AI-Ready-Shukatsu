import type { Company, TaskItem } from "../schema";

function escapeIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  const maxBytes = 75;
  let result = "";
  let current = "";
  let currentBytes = 0;
  let isFirst = true;

  for (const ch of line) {
    const chBytes = Buffer.byteLength(ch, "utf8");
    const limit = isFirst ? maxBytes : maxBytes - 1;

    if (currentBytes + chBytes > limit) {
      result += (isFirst ? "" : " ") + current + "\r\n";
      current = "";
      currentBytes = 0;
      isFirst = false;
    }
    current += ch;
    currentBytes += chBytes;
  }
  return result + (isFirst ? "" : " ") + current;
}

export function formatCalendarIcs(companies: Company[], tasks: TaskItem[]): string {
  const nowStamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI-Ready Shukatsu//v2//JA",
    "CALSCALE:GREGORIAN",
  ];

  // 1. Company Events & ES Deadlines
  for (const company of companies) {
    if (company.isSample || company.deletedAt) continue;

    // Events
    for (const ev of company.events) {
      if (!ev.start) continue;

      const hasTime = ev.start.includes("T");
      const dtStart = hasTime
        ? `DTSTART:${ev.start.replace(/[-:]/g, "")}00`
        : `DTSTART;VALUE=DATE:${ev.start.replace(/-/g, "")}`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:ev-${ev.id}@ai-ready-shukatsu`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(dtStart);
      lines.push(`SUMMARY:${escapeIcs(`[${company.name}] ${ev.title}`)}`);
      const desc = `種別: ${ev.kind}\n場所: ${ev.location || "未設定"}\nメモ: ${ev.notes || ""}`;
      lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
      if (ev.location) {
        lines.push(`LOCATION:${escapeIcs(ev.location)}`);
      }
      lines.push("END:VEVENT");
    }

    // ES Deadlines
    for (const es of company.esEntries) {
      if (!es.deadline || es.status === "submitted") continue;

      const hasTime = es.deadline.includes("T");
      const dtStart = hasTime
        ? `DTSTART:${es.deadline.replace(/[-:]/g, "")}00`
        : `DTSTART;VALUE=DATE:${es.deadline.replace(/-/g, "")}`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:es-${es.id}@ai-ready-shukatsu`);
      lines.push(`DTSTAMP:${nowStamp}`);
      lines.push(dtStart);
      lines.push(`SUMMARY:${escapeIcs(`[${company.name} ES締切] ${es.title}`)}`);
      lines.push(`DESCRIPTION:${escapeIcs(`設問:\n${es.question}`)}`);
      lines.push("END:VEVENT");
    }
  }

  // 2. Open Tasks with Due Dates
  for (const task of tasks) {
    if (task.isSample || task.deletedAt || task.state === "done" || !task.due) continue;

    const company = task.companyId
      ? (companies.find((c) => c.id === task.companyId)?.name ?? "共通")
      : "共通";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:tk-${task.id}@ai-ready-shukatsu`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART;VALUE=DATE:${task.due.replace(/-/g, "")}`);
    lines.push(`SUMMARY:${escapeIcs(`[タスク: ${company}] ${task.title}`)}`);
    lines.push(`DESCRIPTION:${escapeIcs(task.notes || "")}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
