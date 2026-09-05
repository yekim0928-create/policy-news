import { NEWS_SOURCES } from "@/config/sources";
import { CATEGORY_ORDER } from "@/lib/categories";
import CountUp from "./CountUp";

interface StatsBarProps {
  todayCount: number;
}

export default function StatsBar({ todayCount }: StatsBarProps) {
  return (
    <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
      <div>
        <dt className="text-3xl font-bold">
          <CountUp value={CATEGORY_ORDER.length} suffix="개" />
        </dt>
        <dd className="text-sm text-white/65">카테고리</dd>
      </div>
      <div>
        <dt className="text-3xl font-bold">
          <CountUp value={NEWS_SOURCES.length} suffix="개" />
        </dt>
        <dd className="text-sm text-white/65">언론사</dd>
      </div>
      <div>
        <dt className="text-3xl font-bold">
          <CountUp value={todayCount} suffix="건" />
        </dt>
        <dd className="text-sm text-white/65">오늘 수집</dd>
      </div>
    </dl>
  );
}
