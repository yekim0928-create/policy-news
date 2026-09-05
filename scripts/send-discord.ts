import { readFile } from "node:fs/promises";
import path from "node:path";

import { summarizeCategoryOverview } from "../lib/summarize";
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
const TOP_ARTICLE_COUNT = 3;
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

// Discord embed의 description은 최대 4096자다. 기사 요약이 길어져도 안전하게 잘리도록
// 기사 한 건당 요약 길이도 별도로 제한한다.
const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096;
const SUMMARY_MAX_LENGTH = 300;

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

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

// summary가 있으면 우선 사용하고, 없으면 description으로 대체한다.
// 줄바꿈은 공백으로 정리하고 길이를 제한해 Discord 렌더링과 embed 길이 제한을 안전하게 지킨다.
function pickArticleSummary(item: NewsItem): string {
  const raw = item.summary || item.description || "";
  const normalized = raw.replace(/\s+/g, " ").trim();
  return truncateText(normalized, SUMMARY_MAX_LENGTH);
}

// 카테고리 안의 오늘자 기사 전체(items)로 종합 흐름 요약을 만들고,
// 그중 최신 TOP_ARTICLE_COUNT건만 본문에 나열한다.
async function buildEmbed(
  category: Category,
  items: NewsItem[]
): Promise<DiscordEmbed> {
  let overview: string | undefined;
  try {
    overview = await summarizeCategoryOverview(
      items.map((item) => ({ title: item.title, summary: item.summary }))
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[send-discord] 카테고리 종합 요약 실패 (${category}): ${message}`);
  }

  const topItems = items.slice(0, TOP_ARTICLE_COUNT);
  const articleLines = topItems.map((item, index) => {
    const summary = pickArticleSummary(item);
    const summaryLine = summary ? `\n${summary}` : "";
    return `**${index + 1}. [${escapeMarkdown(item.title)}](${item.link})**${summaryLine}\n출처: ${item.source}`;
  });

  // 요약 길이 제한(SUMMARY_MAX_LENGTH) 덕분에 평소에는 초과할 일이 없지만,
  // 혹시 모를 상황에 대비해 4096자 한도를 넘으면 뒤쪽 기사부터 통째로 제외한다
  // (문자열을 임의 위치에서 자르면 마크다운 링크가 깨질 수 있기 때문). overview는 항상 유지한다.
  const kept: string[] = overview ? [overview] : [];
  let length = kept.length > 0 ? kept[0].length : 0;
  for (const line of articleLines) {
    const nextLength = length + (kept.length > 0 ? 2 : 0) + line.length;
    if (nextLength > DISCORD_EMBED_DESCRIPTION_LIMIT) break;
    kept.push(line);
    length = nextLength;
  }
  const description = kept.join("\n\n");

  const title = overview
    ? `${CATEGORY_EMOJI[category]} ${category} | 오늘의 흐름`
    : `${CATEGORY_EMOJI[category]} ${category}`;

  return {
    title,
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

  const allEmbeds: DiscordEmbed[] = [];
  for (const category of CATEGORY_ORDER) {
    allEmbeds.push(await buildEmbed(category, grouped[category]));
  }
  const embeds = allEmbeds.filter((embed) => embed.description.length > 0);

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
