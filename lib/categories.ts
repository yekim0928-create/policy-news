import type { Category } from "@/config/sources";

export const CATEGORY_ORDER: Category[] = [
  "AI이슈",
  "경제",
  "창업",
  "수익화·크리에이터",
  "정부지원정책",
  "AI 거버넌스",
];

// Discord Daily Brief와 동일한 배색/이모지를 써서 채널 간 브랜드를 통일한다.
export const CATEGORY_ACCENT: Record<Category, string> = {
  "AI이슈": "#1d4ed8",
  "경제": "#16a34a",
  "창업": "#f59e0b",
  "수익화·크리에이터": "#d946ef",
  "정부지원정책": "#0ea5e9",
  "AI 거버넌스": "#7c3aed",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  "AI이슈": "🤖",
  "경제": "💰",
  "창업": "🚀",
  "수익화·크리에이터": "🎥",
  "정부지원정책": "🏛️",
  "AI 거버넌스": "⚖️",
};

export const CATEGORY_SLUG: Record<Category, string> = {
  "AI이슈": "ai-issue",
  "경제": "economy",
  "창업": "startup",
  "수익화·크리에이터": "monetization",
  "정부지원정책": "government-support",
  "AI 거버넌스": "ai-governance",
};
