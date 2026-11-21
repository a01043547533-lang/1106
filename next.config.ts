import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["express"],
  outputFileTracingIncludes: {
    "/api/[...path]": [
      "./server/data/prepared/**",
      "./server/data/{calendar,final_rates,links,lottery,rules,service_terms,forecast,exam_schedule,eligible_items}.json",
      "./server/data/snapshots.jsonl",
    ],
    // 특기 상세 페이지는 서버에서 제목·설명(generateMetadata)을 만들 때 같은 자료를 읽는다.
    "/mos/[code]": [
      "./server/data/prepared/**",
      "./server/data/{calendar,final_rates,links,lottery,rules,service_terms,forecast,exam_schedule,eligible_items}.json",
      "./server/data/snapshots.jsonl",
    ],
  },
  outputFileTracingExcludes: {
    "*": [
      "./server/.env",
      "./server/env",
      "./server/web.js",
      "./server/data/_raw/**",
      "./server/data/_backup/**",
      "./server/data/history/**",
      "./server/data/{documents,eligibility,jobfit,mos_master,scoring_rules,scoring_rules_special,social_orgs,subscriptions}.json",
      "./server/data/{collect_log,sent_log,ssr_errors}.jsonl",
      "./.checks/**",
      "./tests/**",
    ],
  },
  // robots.txt에서 /api/를 막지 않는 대신(화면이 /api/로 내용을 불러와야 구글이 본문을 본다),
  // API 응답(JSON·.ics)이 검색 결과에 뜨지 않게 색인 금지 헤더를 붙인다.
  async headers() {
    return [{ source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }];
  },
  async redirects() {
    return [
      { source: "/score", destination: "/calc", permanent: true },
      { source: "/ads", destination: "/about", permanent: true },
    ];
  },
};

export default nextConfig;
