import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";

import { NEWS_SOURCES } from "../config/sources";
import type { NewsItem } from "../types/news";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "news.json");
const MAX_ITEMS = 2000;

const parser = new Parser();

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
  const feed = await parser.parseURL(source.url);
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

// link가 같은 항목은 하나만 남긴다. 뒤에 오는 항목(새로 수집한 결과)이 우선한다.
function dedupeByLink(items: NewsItem[]): NewsItem[] {
  const byLink = new Map<string, NewsItem>();
  for (const item of items) {
    byLink.set(item.link, item);
  }
  return Array.from(byLink.values());
}

async function main(): Promise<void> {
  console.log(`[collect-news] 수집 시작: 총 ${NEWS_SOURCES.length}개 소스`);

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

  const existing = await loadExistingNews();
  const merged = dedupeByLink([...existing, ...collected]);

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
