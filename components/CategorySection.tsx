import { CATEGORY_ACCENT, CATEGORY_EMOJI, CATEGORY_SLUG } from "@/lib/categories";
import type { Category } from "@/config/sources";
import type { NewsItem } from "@/types/news";
import NewsCard from "./NewsCard";

interface CategorySectionProps {
  category: Category;
  items: NewsItem[];
}

export default function CategorySection({ category, items }: CategorySectionProps) {
  const accent = CATEGORY_ACCENT[category];

  return (
    <section id={CATEGORY_SLUG[category]} className="flex scroll-mt-6 flex-col gap-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
        <span
          className="inline-block h-4 w-1 rounded-full"
          style={{ backgroundColor: accent }}
        />
        {CATEGORY_EMOJI[category]} {category}
      </h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">수집된 뉴스가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} accent={accent} />
          ))}
        </div>
      )}
    </section>
  );
}
