import { formatDate, pickSummaryText } from "@/lib/format";
import type { NewsItem } from "@/types/news";

interface NewsCardProps {
  item: NewsItem;
  accent: string;
}

export default function NewsCard({ item, accent }: NewsCardProps) {
  const summaryText = pickSummaryText(item);

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card flex flex-col gap-2 overflow-hidden rounded-xl p-5"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="news-source font-semibold">{item.source}</span>
        <span>{formatDate(item.publishedAt)}</span>
      </div>
      <h3 className="line-clamp-2 text-base font-semibold text-foreground">
        {item.title}
      </h3>
      {summaryText ? (
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {summaryText}
        </p>
      ) : null}
      <span className="mt-auto text-sm font-medium text-primary">
        원문 보기 →
      </span>
    </a>
  );
}
