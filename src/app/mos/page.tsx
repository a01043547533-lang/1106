import type { Metadata } from "next";
import { MosIndex as MosIndex } from "@/legacy/pages/Mos.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";
import { MosIndexSummary } from "@/app/_seo/summaries";

// 서버 HTML 본문(검색엔진·광고 심사용 요약)을 하루마다 새 자료로 다시 만든다.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "모집병 특기 전체 목록 | 입대타이밍",
  description: "특기를 누르면 신체조건, 지원 자격·면허·전공, 회차별 경쟁률을 볼 수 있어요.",
  alternates: { canonical: "/mos" },
};

export default function Page() {
  return (
    <ClientOnly fallback={<MosIndexSummary />}>
      <MosIndex />
    </ClientOnly>
  );
}
