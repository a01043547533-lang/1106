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
  async redirects() {
    return [
      { source: "/score", destination: "/calc", permanent: true },
      { source: "/ads", destination: "/about", permanent: true },
    ];
  },
};

export default nextConfig;
