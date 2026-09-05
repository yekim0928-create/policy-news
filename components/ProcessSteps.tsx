import { NEWS_SOURCES } from "@/config/sources";
import { CATEGORY_ORDER } from "@/lib/categories";

const STEPS = [
  {
    number: "01",
    title: "RSS 수집",
    description: `${NEWS_SOURCES.length}개 소스를 2시간마다 자동으로 모읍니다.`,
  },
  {
    number: "02",
    title: "AI 요약",
    description: "제목과 본문을 2~3문장으로 정리합니다.",
  },
  {
    number: "03",
    title: "카테고리별 열람",
    description: `${CATEGORY_ORDER.length}개 카테고리로 나눠 한눈에 볼 수 있습니다.`,
  },
];

export default function ProcessSteps() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-12 sm:px-10 md:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.number} className="step-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hero text-sm font-bold text-white">
                {step.number}
              </span>
              <span className="h-px flex-1 border-t border-dashed border-border" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
