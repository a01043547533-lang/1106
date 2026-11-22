import Home from "@/legacy/pages/Home.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";
import { HomeSummary } from "@/app/_seo/summaries";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// 서버 HTML 본문(검색엔진·광고 심사용 요약)을 한 시간마다 새 자료로 다시 만든다.
export const revalidate = 3600;

export default function Page() {
  return (
    <ClientOnly fallback={<HomeSummary />}>
      <Home />
    </ClientOnly>
  );
}
