export interface NewsItem {
  id: string; // 뉴스 항목의 고유 식별자
  title: string; // 뉴스 제목
  link: string; // 원문 기사 링크
  source: string; // 출처 기관/매체명
  sourceId: string; // config/sources.ts에 정의된 NewsSource의 id
  category: string; // 뉴스 카테고리
  publishedAt: string; // 원문 발행 일시
  collectedAt: string; // 수집(크롤링) 일시
  description?: string; // 요약 또는 본문 일부 (선택)
}
