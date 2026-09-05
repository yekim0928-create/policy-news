import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Category } from "../config/sources";
import type { NewsItem } from "../types/news";

const CATEGORY_ORDER: Category[] = [
  "AI이슈",
  "경제",
  "창업",
  "수익화·크리에이터",
  "정부지원정책",
  "UX/UI",
];
const MAX_ITEMS_PER_CATEGORY = 5;
const SEOUL_TIME_ZONE = "Asia/Seoul";

const CATEGORY_COLOR: Record<Category, number> = {
  "AI이슈": 0x1d4ed8,
  "경제": 0x16a34a,
  "창업": 0xf59e0b,
  "수익화·크리에이터": 0xd946ef,
  "정부지원정책": 0x0ea5e9,
  "UX/UI": 0x64748b,
};

const CATEGORY_EMOJI: Record<Category, string> = {
  "AI이슈": "🤖",
  "경제": "💰",
  "창업": "🚀",
  "수익화·크리에이터": "🎥",
  "정부지원정책": "🏛️",
  "UX/UI": "🎨",
};

const BRIEF_TITLE = "📌 Daily Brief";

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
}

async function loadNews(): Promise<NewsItem[]> {
  const filePath = path.join(process.cwd(), "data", "news.json");
  const raw = await readFile(filePath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as NewsItem[]) : [];
}

// Asia/Seoul 기준 YYYY-MM-DD 문자열로 변환해 날짜 비교에 사용한다.
function toSeoulDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function filterCollectedToday(items: NewsItem[]): NewsItem[] {
  const today = toSeoulDateKey(new Date().toISOString());
  return items.filter((item) => toSeoulDateKey(item.collectedAt) === today);
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

// 마크다운 링크 문법이 깨지지 않도록 대괄호와 백슬래시를 이스케이프한다.
function escapeMarkdown(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function buildEmbed(category: Category, items: NewsItem[]): DiscordEmbed {
  const description = items
    .map(
      (item) => `**[${escapeMarkdown(item.title)}](${item.link})**\n${item.source}`
    )
    .join("\n\n");

  return {
    title: `${CATEGORY_EMOJI[category]} ${category}`,
    description,
    color: CATEGORY_COLOR[category],
  };
}

async function sendToDiscord(
  webhookUrl: string,
  content: string,
  embeds: DiscordEmbed[]
): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, embeds }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Discord Webhook 전송 실패 (status ${response.status}): ${body}`
    );
  }
}

async function main(): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("환경변수 DISCORD_WEBHOOK_URL이 설정되어 있지 않습니다.");
  }

  const news = await loadNews();
  const todayNews = filterCollectedToday(news);
  const grouped = groupByCategory(todayNews);

  const embeds = CATEGORY_ORDER.map((category) =>
    buildEmbed(category, grouped[category].slice(0, MAX_ITEMS_PER_CATEGORY))
  ).filter((embed) => embed.description.length > 0);

  if (embeds.length === 0) {
    console.log("[send-discord] 오늘 수집된 뉴스가 없어 전송을 건너뜁니다.");
    return;
  }

  const content = `${BRIEF_TITLE}\n오늘 수집된 기사: 총 ${todayNews.length}건`;

  await sendToDiscord(webhookUrl, content, embeds);

  console.log(`[send-discord] Discord 전송 완료: 총 ${embeds.length}개 카테고리`);
}

main().catch((error) => {
  console.error("[send-discord] 실행 중 오류 발생:", error);
  process.exit(1);
});
