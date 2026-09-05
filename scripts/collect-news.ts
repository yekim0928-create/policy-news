import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";

import { NEWS_SOURCES } from "../config/sources";
import { summarizeArticle } from "../lib/summarize";
import type { NewsItem } from "../types/news";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "news.json");
const MAX_ITEMS = 2000;
const SUMMARY_CONCURRENCY = 3;

const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

const parser = new Parser({ timeout: REQUEST_TIMEOUT_MS });

// rss-parser의 parseURL은 내부적으로 raw http.get을 사용해 User-Agent를 차단하는
// 서버(WAF)나 gzip 압축 응답을 제대로 처리하지 못한다. fetch로 직접 받아온 뒤
// 문자열을 파싱하면 두 문제를 모두 우회할 수 있다.
async function fetchFeedXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

// 기본 rss-parser 요청(User-Agent: "rss-parser")으로 먼저 시도하고,
// 실패하면 브라우저 User-Agent로 직접 fetch한 뒤 파싱한다.
// (일부 서버는 정체불명의 User-Agent를, 일부 서버는 반대로 fetch 클라이언트를 차단하기 때문에
// 두 방식을 순서대로 시도해 소스별 특이사항을 하드코딩하지 않고 대응한다.)
async function fetchFeed(url: string): Promise<Parser.Output<Record<string, unknown>>> {
  try {
    return await parser.parseURL(url);
  } catch {
    const xml = await fetchFeedXml(url);
    return parser.parseString(xml);
  }
}

// URL 또는 guid 문자열을 sha256 해시로 변환해 뉴스 항목의 고유 id로 사용한다.
function createId(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// 기존 data/news.json을 읽는다. 파일이 없거나 형식이 잘못됐으면 빈 배열로 취급한다.
async function loadExistingNews(): Promise<NewsItem[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NewsItem[]) : [];
  } catch {
    return [];
  }
}

// 하나의 RSS 소스를 읽어 NewsItem 배열로 변환한다.
async function collectFromSource(
  source: (typeof NEWS_SOURCES)[number]
): Promise<NewsItem[]> {
  const feed = await fetchFeed(source.url);
  const collectedAt = new Date().toISOString();

  return (feed.items ?? []).map((item) => {
    const link = item.link ?? "";
    const idSource = item.guid ?? link ?? item.title ?? "";

    return {
      id: createId(idSource),
      title: item.title ?? "",
      link,
      source: source.name,
      sourceId: source.id,
      category: source.category,
      publishedAt: item.isoDate ?? item.pubDate ?? collectedAt,
      collectedAt,
      description: item.contentSnippet ?? item.content ?? undefined,
    };
  });
}

// items를 최대 limit개까지 동시에 worker로 처리한다 (AI 요약 API에 과도한 동시 요청을 보내지 않기 위함).
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) return;
      results[current] = await worker(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runWorker)
  );

  return results;
}

// AI 요약이 없거나 실패했을 때 description을 정리해 대체 요약으로 쓴다. description도 없으면 빈 문자열.
function fallbackSummary(description?: string): string {
  if (!description) return "";
  const cleaned = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > 200 ? `${cleaned.slice(0, 200).trimEnd()}…` : cleaned;
}

// 신규 기사 한 건을 요약한다. AI 요약 실패는 여기서 흡수하고 fallbackSummary로 대체하여
// 이 함수를 호출하는 상위 수집 흐름에는 절대 예외를 전파하지 않는다.
async function attachSummary(item: NewsItem): Promise<NewsItem> {
  try {
    const summary = await summarizeArticle(item.title, item.description);
    return { ...item, summary: summary ?? fallbackSummary(item.description) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      `[collect-news] 요약 실패 (${item.sourceId}) "${item.title}": ${message}`
    );
    return { ...item, summary: fallbackSummary(item.description) };
  }
}

// 기존 기사와 새로 수집한 기사를 id(URL 또는 guid 기반) 기준으로 합친다.
// 제목/설명 등은 새로 수집한 값으로 갱신하되, summary는 이번에 새로 계산된 값이 없으면
// 기존 값을 그대로 보존한다 (이미 요약된 기존 기사는 재요약하지 않기 위함).
function mergeNews(existing: NewsItem[], collected: NewsItem[]): NewsItem[] {
  const merged = new Map<string, NewsItem>();

  for (const item of existing) {
    merged.set(item.id, item);
  }

  for (const item of collected) {
    const previous = merged.get(item.id);
    merged.set(item.id, {
      ...item,
      summary: item.summary ?? previous?.summary,
    });
  }

  return Array.from(merged.values());
}

async function main(): Promise<void> {
  console.log(`[collect-news] 수집 시작: 총 ${NEWS_SOURCES.length}개 소스`);

  const existing = await loadExistingNews();
  const existingIds = new Set(existing.map((item) => item.id));

  const collected: NewsItem[] = [];

  for (const source of NEWS_SOURCES) {
    try {
      const items = await collectFromSource(source);
      collected.push(...items);
      console.log(
        `[collect-news] ${source.name} (${source.id}): ${items.length}건 수집 성공`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `[collect-news] ${source.name} (${source.id}): 수집 실패 - ${message}`
      );
    }
  }

  // 기존 data/news.json에 없던(URL/guid 기준 신규) 기사만 요약 대상으로 삼는다.
  const newItems = collected.filter((item) => !existingIds.has(item.id));
  console.log(
    `[collect-news] 신규 기사 ${newItems.length}건 요약 시작 (동시 처리 ${SUMMARY_CONCURRENCY}건)`
  );

  const summarized = await mapWithConcurrency(
    newItems,
    SUMMARY_CONCURRENCY,
    attachSummary
  );
  const summarizedById = new Map(summarized.map((item) => [item.id, item]));
  const collectedWithSummary = collected.map(
    (item) => summarizedById.get(item.id) ?? item
  );

  const emptyCount = summarized.filter((item) => !item.summary).length;
  console.log(
    `[collect-news] 요약 처리 완료: 총 ${summarized.length}건 (요약 없음 ${emptyCount}건)`
  );

  const merged = mergeNews(existing, collectedWithSummary);

  merged.sort((a, b) => {
    const aTime = new Date(a.publishedAt).getTime();
    const bTime = new Date(b.publishedAt).getTime();
    return bTime - aTime;
  });

  const final = merged.slice(0, MAX_ITEMS);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(final, null, 2) + "\n", "utf-8");

  console.log(`[collect-news] 최종 저장 건수: ${final.length}건 -> ${DATA_FILE}`);
}

main().catch((error) => {
  console.error("[collect-news] 실행 중 오류 발생:", error);
  process.exit(1);
});
