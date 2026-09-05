import { NEWS_SOURCES } from "@/config/sources";

export default function SourceMarquee() {
  const names = NEWS_SOURCES.map((source) => source.name);
  // 이음매 없이 반복되도록 리스트를 두 번 이어붙이고, CSS 애니메이션으로 절반(-50%)만큼 움직인다.
  const track = [...names, ...names];

  return (
    <div className="marquee border-b border-border bg-background-subtle py-3">
      <div className="marquee-track">
        {track.map((name, index) => (
          <span
            key={index}
            className="flex shrink-0 items-center text-xs text-muted-foreground"
          >
            {name}
            <span aria-hidden className="mx-4 text-border">
              ·
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
