import type { ReactNode } from "react";

interface MarkdownPreviewProps {
  content: string;
  emptyText?: string;
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = pattern.exec(text);
  let key = 0;

  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(token);
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-fg)", textDecoration: "underline" }}
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = match.index + token.length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function MarkdownPreview({ content, emptyText = "内容がありません" }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <p className="gh-muted" style={{ margin: 0, fontSize: "13px" }}>
        {emptyText}
      </p>
    );
  }

  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: { ordered: boolean; items: { id: number; text: string }[] } | null = null;
  let key = 0;

  const flushList = () => {
    if (!listItems) return;
    const Tag = listItems.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={key++}>
        {listItems.items.map((item) => (
          <li key={item.id}>{renderInline(item.text)}</li>
        ))}
      </Tag>,
    );
    listItems = null;
  };

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!;
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(<h3 key={key++}>{renderInline(trimmed.slice(4))}</h3>);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(<h2 key={key++}>{renderInline(trimmed.slice(3))}</h2>);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(<h1 key={key++}>{renderInline(trimmed.slice(2))}</h1>);
      continue;
    }
    if (trimmed.startsWith("> ")) {
      flushList();
      blocks.push(<blockquote key={key++}>{renderInline(trimmed.slice(2))}</blockquote>);
      continue;
    }
    if (/^[-*] /.test(trimmed)) {
      if (!listItems || listItems.ordered) {
        flushList();
        listItems = { ordered: false, items: [] };
      }
      listItems.items.push({ id: lineIdx, text: trimmed.slice(2) });
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!listItems || !listItems.ordered) {
        flushList();
        listItems = { ordered: true, items: [] };
      }
      listItems.items.push({ id: lineIdx, text: trimmed.replace(/^\d+\.\s+/, "") });
      continue;
    }

    flushList();
    blocks.push(<p key={key++}>{renderInline(trimmed)}</p>);
  }

  flushList();
  return <div className="gh-markdown">{blocks}</div>;
}
