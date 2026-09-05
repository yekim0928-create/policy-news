import { readFile } from "node:fs/promises";
import path from "node:path";

import { NEWS_SOURCES } from "@/config/sources";
import type { Category } from "@/config/sources";
import type { NewsItem } from "@/types/news";

const CATEGORY_ORDER: Category[] = [
  "AI이슈",
  "경제",
  "창업",
  "수익화·크리에이터",
  "정부지원정책",
  "AI 거버넌스",
];
const MAX_ITEMS_PER_CATEGORY = 12;
const SEOUL_TIME_ZONE = "Asia/Seoul";

// Discord Daily Brief와 동일한 배색/이모지를 써서 채널 간 브랜드를 통일한다.
const CATEGORY_ACCENT: Record<Category, string> = {
  "AI이슈": "#1d4ed8",
  "경제": "#16a34a",
  "창업": "#f59e0b",
  "수익화·크리에이터": "#d946ef",
  "정부지원정책": "#0ea5e9",
  "AI 거버넌스": "#7c3aed",
};

const CATEGORY_EMOJI: Record<Category, string> = {
  "AI이슈": "🤖",
  "경제": "💰",
  "창업": "🚀",
  "수익화·크리에이터": "🎥",
  "정부지원정책": "🏛️",
  "AI 거버넌스": "⚖️",
};

const CATEGORY_SLUG: Record<Category, string> = {
  "AI이슈": "ai-issue",
  "경제": "economy",
  "창업": "startup",
  "수익화·크리에이터": "monetization",
  "정부지원정책": "government-support",
  "AI 거버넌스": "ai-governance",
};

const STEPS = [
  {
    number: "01",
    title: "RSS 수집",
    description: `${NEWS_SOURCES.length}개 소스를 2시간마다 자동으로 모읍니다.`,
  },
  {
    number: "02",
    title: "AI 요약",
    description: "제목과 본문을 2~3문장으로 정리합니다.",
  },
  {
    number: "03",
    title: "카테고리별 열람",
    description: `${CATEGORY_ORDER.length}개 카테고리로 나눠 한눈에 볼 수 있습니다.`,
  },
];

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

// Asia/Seoul 기준 YYYY-MM-DD 문자열로 변환해 "오늘 수집" 통계에 사용한다.
function toSeoulDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function countCollectedToday(items: NewsItem[]): number {
  const today = toSeoulDateKey(new Date().toISOString());
  return items.filter((item) => toSeoulDateKey(item.collectedAt) === today).length;
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
  const todayCount = countCollectedToday(news);

  return (
    <div className="flex flex-1 flex-col bg-background-subtle font-sans">
      <header className="bg-[#0f3d2e] text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <span className="text-lg font-bold tracking-tight">Policy Brief</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
            {CATEGORY_ORDER.map((category) => (
              <a
                key={category}
                href={`#${CATEGORY_SLUG[category]}`}
                className="transition hover:text-white"
              >
                {category}
              </a>
            ))}
          </nav>
        </div>

        <div className="mx-auto w-full max-w-6xl px-6 pb-14 pt-4 sm:px-10">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            RSS·AI가 정리해주는
            <br />
            정책·기술·경제 뉴스
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/75">
            {NEWS_SOURCES.length}개 언론사·연구기관을 2시간마다 자동 수집·AI 요약해
            보여드립니다.
          </p>
          <a
            href="#news"
            className="mt-6 inline-block rounded-full bg-yellow-300 px-6 py-3 text-sm font-semibold text-[#0f3d2e] transition hover:bg-yellow-200"
          >
            최신 뉴스 보기 →
          </a>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-3xl font-bold">{CATEGORY_ORDER.length}개</dt>
              <dd className="text-sm text-white/65">카테고리</dd>
            </div>
            <div>
              <dt className="text-3xl font-bold">{NEWS_SOURCES.length}개</dt>
              <dd className="text-sm text-white/65">언론사</dd>
            </div>
            <div>
              <dt className="text-3xl font-bold">{todayCount}건</dt>
              <dd className="text-sm text-white/65">오늘 수집</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="border-b border-border bg-background-subtle py-3">
        <p className="mx-auto max-w-6xl overflow-x-auto whitespace-nowrap px-6 text-xs text-muted-foreground sm:px-10">
          {NEWS_SOURCES.map((source) => source.name).join(" · ")}
        </p>
      </div>

      <section className="border-b border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 sm:px-10 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f3d2e] text-sm font-bold text-white">
                  {step.number}
                </span>
                <span className="h-px flex-1 border-t border-dashed border-border" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <main
        id="news"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-12 sm:px-10"
      >
        {CATEGORY_ORDER.map((category) => {
          const items = grouped[category].slice(0, MAX_ITEMS_PER_CATEGORY);
          const accent = CATEGORY_ACCENT[category];

          return (
            <section
              key={category}
              id={CATEGORY_SLUG[category]}
              className="flex scroll-mt-6 flex-col gap-4"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <span
                  className="inline-block h-4 w-1 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                {CATEGORY_EMOJI[category]} {category}
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
                        className="news-card flex flex-col gap-2 overflow-hidden rounded-xl p-5"
                        style={{ borderTopColor: accent, borderTopWidth: 3 }}
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
