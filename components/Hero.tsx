import { NEWS_SOURCES } from "@/config/sources";
import { CATEGORY_ORDER, CATEGORY_SLUG } from "@/lib/categories";
import StatsBar from "./StatsBar";

interface HeroProps {
  todayCount: number;
}

export default function Hero({ todayCount }: HeroProps) {
  return (
    <header className="bg-hero text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <span className="text-lg font-bold tracking-tight">Policy Brief</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
          {CATEGORY_ORDER.map((category) => (
            <a
              key={category}
              href={`#${CATEGORY_SLUG[category]}`}
              className="transition hover:text-white"
            >
              {category}
            </a>
          ))}
        </nav>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pb-14 pt-4 sm:px-10">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          RSS·AI가 정리해주는
          <br />
          정책·기술·경제 뉴스
        </h1>
        <p className="mt-4 max-w-xl text-base text-white/75">
          {NEWS_SOURCES.length}개 언론사·연구기관을 2시간마다 자동 수집·AI 요약해
          보여드립니다.
        </p>
        <a
          href="#news"
          className="mt-6 inline-block rounded-full bg-yellow-300 px-6 py-3 text-sm font-semibold text-hero transition hover:bg-yellow-200"
        >
          최신 뉴스 보기 →
        </a>

        <StatsBar todayCount={todayCount} />
      </div>
    </header>
  );
}
