import { readFile } from "node:fs/promises";
import path from "node:path";

import CategorySection from "@/components/CategorySection";
import Hero from "@/components/Hero";
import ProcessSteps from "@/components/ProcessSteps";
import SourceMarquee from "@/components/SourceMarquee";
import { CATEGORY_ORDER } from "@/lib/categories";
import type { Category } from "@/config/sources";
import type { NewsItem } from "@/types/news";

const MAX_ITEMS_PER_CATEGORY = 12;
const SEOUL_TIME_ZONE = "Asia/Seoul";

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
      <Hero todayCount={todayCount} />
      <SourceMarquee />
      <ProcessSteps />

      <main
        id="news"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-12 sm:px-10"
      >
        {CATEGORY_ORDER.map((category) => (
          <CategorySection
            key={category}
            category={category}
            items={grouped[category].slice(0, MAX_ITEMS_PER_CATEGORY)}
          />
        ))}
      </main>
    </div>
  );
}
