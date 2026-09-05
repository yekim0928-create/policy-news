import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Category } from "@/config/sources";
import type { NewsItem } from "@/types/news";

const CATEGORY_ORDER: Category[] = [
  "AI이슈",
  "경제",
  "창업",
  "수익화·크리에이터",
  "정부지원정책",
  "UX/UI",
];
const MAX_ITEMS_PER_CATEGORY = 12;

async function loadNews(): Promise<NewsItem[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "news.json");
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NewsItem[]) : [];
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
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

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength
    ? `${text.slice(0, maxLength).trimEnd()}…`
    : text;
}

// AI 요약(summary)이 있으면 그대로 쓰고, 없으면 description을 정리해 대신 보여준다.
function pickSummaryText(item: NewsItem): string | undefined {
  if (item.summary) return item.summary;
  if (item.description) return truncate(stripHtml(item.description), 120);
  return undefined;
}

function formatDate(iso: string): string {
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

function groupByCategory(items: NewsItem[]): Record<Category, NewsItem[]> {
  const grouped = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [category, [] as NewsItem[]])
  ) as Record<Category, NewsItem[]>;

  for (const item of items) {
    if ((CATEGORY_ORDER as string[]).includes(item.category)) {
      grouped[item.category as Category].push(item);
    }
  }

  return grouped;
}

export default async function Home() {
  const news = await loadNews();
  const sorted = [...news].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  const grouped = groupByCategory(sorted);

  return (
    <div className="flex flex-1 flex-col bg-background-subtle font-sans">
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-5xl px-6 pt-14 pb-8 sm:px-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Policy Brief
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            AI이슈 · 경제 · 창업 · 수익화·크리에이터 · 정부지원정책 · UX/UI 뉴스를 한곳에서
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12 sm:px-10">
        {CATEGORY_ORDER.map((category) => {
          const items = grouped[category].slice(0, MAX_ITEMS_PER_CATEGORY);

          return (
            <section key={category} className="flex flex-col gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <span className="inline-block h-4 w-1 rounded-full bg-primary" />
                {category}
              </h2>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  수집된 뉴스가 없습니다.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => {
                    const summaryText = pickSummaryText(item);

                    return (
                      <a
                        key={item.id}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="news-card flex flex-col gap-2 rounded-xl p-5"
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="news-source font-semibold">
                            {item.source}
                          </span>
                          <span>{formatDate(item.publishedAt)}</span>
                        </div>
                        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
                          {item.title}
                        </h3>
                        {summaryText ? (
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {summaryText}
                          </p>
                        ) : null}
                        <span className="mt-auto text-sm font-medium text-primary">
                          원문 보기 →
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
