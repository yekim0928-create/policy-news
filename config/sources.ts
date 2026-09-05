export type Category =
  | "AI이슈"
  | "경제"
  | "창업"
  | "수익화·크리에이터"
  | "정부지원정책"
  | "UX/UI";

export interface NewsSource {
  id: string;
  name: string;
  category: Category;
  url: string;
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "aitimes",
    name: "AI타임스",
    category: "AI이슈",
    url: "https://www.aitimes.com/rss/allArticle.xml"
  },
  {
    id: "openai-news",
    name: "OpenAI",
    category: "AI이슈",
    url: "https://openai.com/news/rss.xml"
  },
  {
    id: "mk-economy",
    name: "매일경제 경제",
    category: "경제",
    url: "https://www.mk.co.kr/rss/30100041/"
  },
  {
    id: "hankyung-economy",
    name: "한국경제",
    category: "경제",
    url: "https://www.hankyung.com/feed/economy"
  },
  {
    id: "fed-press",
    name: "미 연준 보도자료",
    category: "경제",
    url: "https://www.federalreserve.gov/feeds/press_all.xml"
  },
  {
    id: "platum",
    name: "플래텀",
    category: "창업",
    url: "https://platum.kr/feed"
  },
  {
    id: "tubefilter",
    name: "Tubefilter",
    category: "수익화·크리에이터",
    url: "https://www.tubefilter.com/feed/"
  },
  {
    id: "google-news-support-program",
    name: "Google News 지원사업 검색 RSS",
    category: "정부지원정책",
    url: "https://news.google.com/rss/search?q=%22%EC%A7%80%EC%9B%90%EC%82%AC%EC%97%85%22+%EA%B3%B5%EA%B3%A0+OR+%EB%AA%A8%EC%A7%91&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    id: "geeknews",
    name: "GeekNews",
    category: "UX/UI",
    url: "https://news.hada.io/rss/news"
  }
];
