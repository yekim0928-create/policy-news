export type Category =
  | "AI·ICT"
  | "과학기술"
  | "경제";

export interface NewsSource {
  id: string;
  name: string;
  category: Category;
  url: string;
}

export const NEWS_SOURCES: NewsSource[] = [
  {
    id: "msit-press",
    name: "과학기술정보통신부 보도자료",
    category: "AI·ICT",
    url: "https://www.msit.go.kr/user/rss/rss.do?bbsSeqNo=94"
  },
  {
    id: "msit-rnd",
    name: "과학기술정보통신부 연구개발·미래인재정책",
    category: "과학기술",
    url: "https://www.msit.go.kr/user/rss/rss.do?bbsSeqNo=65"
  },
  {
    id: "bok-press",
    name: "한국은행 보도자료",
    category: "경제",
    url: "https://www.bok.or.kr/portal/bbs/B0000552/news.rss?menuNo=200690"
  }
];
