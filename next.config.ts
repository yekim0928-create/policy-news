import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // app/page.tsx가 서버에서 fs로 data/news.json을 직접 읽는다.
  // Vercel 배포 시 서버리스 함수 번들에 이 파일이 확실히 포함되도록 명시한다.
  outputFileTracingIncludes: {
    "/**": ["./data/news.json"],
  },
};

export default nextConfig;
