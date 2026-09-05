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
  "AI 거버넌스",
];
const TOP_ARTICLE_COUNT = 3;
const SEOUL_TIME_ZONE = "Asia/Seoul";

const CATEGORY_COLOR: Record<Category, number> = {
  "AI이슈": 0x1d4ed8,
  "경제": 0x16a34a,
  "창업": 0xf59e0b,
  "수익화·크리에이터": 0xd946ef,
  "정부지원정책": 0x0ea5e9,
  "AI 거버넌스": 0x7c3aed,
};

const CATEGORY_EMOJI: Record<Category, string> = {
  "AI이슈": "🤖",
  "경제": "💰",
  "창업": "🚀",
  "수익화·크리에이터": "🎥",
  "정부지원정책": "🏛️",
  "AI 거버넌스": "⚖️",
};

const BRIEF_TITLE = "📌 Daily Brief";

// Discord embed 하나의 description은 최대 4096자, 한 메시지에 담긴 모든 embed의
// title+description 합은 최대 6000자다. 기사 요약이 길어져도 안전하게 잘리도록
// 기사 한 건당 요약 길이도 별도로 제한한다.
const DISCORD_EMBED_DESCRIPTION_LIMIT = 4096;
const DISCORD_MESSAGE_TOTAL_LIMIT = 6000;
const SUMMARY_MAX_LENGTH = 300;

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
}

// 카테고리 임베드를 최종 조립하기 전 상태. sections[0]은 있다면 카테고리 종합 요약이고,
// 나머지는 기사별 블록이다 — 실제 길이 제한은 assembleEmbeds에서 전체를 보며 적용한다.
interface EmbedDraft {
  title: string;
  color: number;
  sections: string[];
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
// 그중 최신 TOP_ARTICLE_COUNT건의 블록을 함께 준비한다. 실제 길이 제한(embed당 4096자 /
// 메시지 전체 6000자)은 모든 카테고리를 한꺼번에 보며 assembleEmbeds에서 적용한다.
async function buildEmbedDraft(
  category: Category,
  items: NewsItem[]
): Promise<EmbedDraft> {
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

  return {
    title: overview
      ? `${CATEGORY_EMOJI[category]} ${category} | 오늘의 흐름`
      : `${CATEGORY_EMOJI[category]} ${category}`,
    color: CATEGORY_COLOR[category],
    sections: overview ? [overview, ...articleLines] : articleLines,
  };
}

// 주어진 순서대로 section을 이어붙이되 limit(문자 수)을 넘기면 뒤쪽 section부터 통째로 제외한다
// (문자열을 임의 위치에서 자르면 마크다운 링크가 깨질 수 있어 section 단위로만 자른다).
function packSections(sections: string[], limit: number): string[] {
  const kept: string[] = [];
  let length = 0;
  for (const section of sections) {
    const nextLength = length + (kept.length > 0 ? 2 : 0) + section.length;
    if (nextLength > limit) break;
    kept.push(section);
    length = nextLength;
  }
  return kept;
}

// Discord 메시지 한 건에 담긴 모든 embed의 title+description 합은 6000자를 넘을 수 없고,
// embed 하나의 description도 4096자를 넘을 수 없다. 두 한도를 모두 지키면서
// CATEGORY_ORDER 순서상 앞쪽 카테고리를 우선하고, 예산이 부족하면 뒤쪽 카테고리부터 줄인다.
function assembleEmbeds(drafts: EmbedDraft[]): DiscordEmbed[] {
  const embeds: DiscordEmbed[] = [];
  let remaining = DISCORD_MESSAGE_TOTAL_LIMIT;

  for (const draft of drafts) {
    if (draft.sections.length === 0) continue;
    if (draft.title.length >= remaining) break;

    const descLimit = Math.min(
      DISCORD_EMBED_DESCRIPTION_LIMIT,
      remaining - draft.title.length
    );
    const description = packSections(draft.sections, descLimit).join("\n\n");
    if (!description) continue;

    embeds.push({ title: draft.title, description, color: draft.color });
    remaining -= draft.title.length + description.length;
  }

  return embeds;
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

  const drafts: EmbedDraft[] = [];
  for (const category of CATEGORY_ORDER) {
    drafts.push(await buildEmbedDraft(category, grouped[category]));
  }
  const embeds = assembleEmbeds(drafts);

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
