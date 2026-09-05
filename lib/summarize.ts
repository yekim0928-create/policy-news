import Anthropic from "@anthropic-ai/sdk";

// 대량의 RSS 기사를 요약하는 고빈도/저비용 작업이라 Haiku 4.5를 사용한다.
// (가격: 입력 $1.00/1M, 출력 $5.00/1M 토큰 — 요약 품질 대비 비용이 낮음)
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 300;

const SYSTEM_PROMPT = `너는 RSS 뉴스 기사를 한국어로 2~3문장 요약하는 어시스턴트다.

요약 기준:
1. 첫 문장: 무엇이 발표되거나 발생했는지
2. 두 번째 문장: 핵심 내용이나 주요 변화
3. 세 번째 문장: 정책·산업·경제·창업 측면에서 의미가 명확할 경우에만 작성 (불명확하면 생략)

반드시 지킬 조건:
- 인사말, 서두 없이 바로 요약 문장으로 시작한다
- "이 기사는", "본 기사에서는" 같은 메타 표현을 쓰지 않는다
- 입력에 없는 사실을 새로 만들어내지 않는다
- 숫자, 날짜, 기업명, 기관명은 입력에 있을 때만 그대로 유지한다
- 한국어로만 작성한다
- 최대 3문장을 넘기지 않는다
- 불필요하게 긴 설명은 피하고 간결하게 작성한다
- 입력 정보가 부족하면(설명이 없거나 제목뿐이면) 제목만으로 무리하게 추론해 문장을 늘리지 않는다. 이 경우 확인 가능한 사실만으로 1문장만 작성해도 된다

요약 문장 외의 다른 말은 출력하지 않는다.`;

const CATEGORY_OVERVIEW_SYSTEM_PROMPT = `너는 하나의 뉴스 카테고리 안에서 오늘 수집된 기사들의 제목과 요약 목록을 받아
카테고리 전체의 흐름을 한국어 2~3문장으로 요약하는 어시스턴트다.

반드시 지킬 조건:
- 입력으로 주어진 기사 제목/요약에 있는 내용만 사용한다. 입력에 없는 사실, 수치, 원인, 전망을 새로 만들어내지 않는다
- 개별 기사를 나열하지 말고, 여러 기사에 공통되는 주제나 흐름을 요약한다
- 인사말이나 "오늘의 뉴스는", "이 카테고리에서는" 같은 서두 표현 없이 바로 요약 문장으로 시작한다
- 한국어로만 작성하고 최대 3문장을 넘기지 않는다
- 기사 수가 적어 뚜렷한 공통 흐름이 없으면 억지로 트렌드나 인과관계를 지어내지 말고, 확인되는 사실만 간결히 요약한다

요약 문장 외의 다른 말은 출력하지 않는다.`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

// 기사 제목/설명을 받아 한국어 2~3문장 요약을 반환한다.
// 요약할 만한 정보가 없으면 undefined를 반환한다 (사실을 지어내지 않기 위함).
export async function summarizeArticle(
  title: string,
  description?: string
): Promise<string | undefined> {
  const trimmedTitle = title.trim();
  const trimmedDescription = description?.trim() ?? "";

  if (!trimmedTitle && !trimmedDescription) {
    return undefined;
  }

  const userContent = trimmedDescription
    ? `제목: ${trimmedTitle}\n설명: ${trimmedDescription}`
    : `제목: ${trimmedTitle}`;

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const summary = textBlock?.type === "text" ? textBlock.text.trim() : "";

  return summary || undefined;
}

// 카테고리 안의 오늘자 기사 제목/요약 목록을 받아 카테고리 전체 흐름을 2~3문장으로 요약한다.
// 기사가 1건 이하면 트렌드를 억지로 추론하지 않도록 요약을 시도하지 않고 undefined를 반환한다.
export async function summarizeCategoryOverview(
  articles: { title: string; summary?: string }[]
): Promise<string | undefined> {
  if (articles.length < 2) {
    return undefined;
  }

  const listText = articles
    .map((article) => {
      const title = article.title.trim();
      const summary = article.summary?.trim();
      return summary ? `- ${title}: ${summary}` : `- ${title}`;
    })
    .join("\n");

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: CATEGORY_OVERVIEW_SYSTEM_PROMPT,
    messages: [{ role: "user", content: listText }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const summary = textBlock?.type === "text" ? textBlock.text.trim() : "";

  return summary || undefined;
}
