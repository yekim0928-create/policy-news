import type { NewsItem } from "@/types/news";

export function stripHtml(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength
    ? `${text.slice(0, maxLength).trimEnd()}…`
    : text;
}

// AI 요약(summary)이 있으면 그대로 쓰고, 없으면 description을 정리해 대신 보여준다.
export function pickSummaryText(item: NewsItem): string | undefined {
  if (item.summary) return item.summary;
  if (item.description) return truncate(stripHtml(item.description), 120);
  return undefined;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
