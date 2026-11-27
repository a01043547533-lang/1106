import type { Metadata } from "next";
import { MosIndex as MosIndex } from "@/legacy/pages/Mos.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";
import { MosIndexSummary } from "@/app/_seo/summaries";
import { meta, mosIndex } from "../../../server/queries.js";

// 서버 HTML 본문(검색엔진·광고 심사용 요약)을 하루마다 새 자료로 다시 만든다.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "모집병 특기 전체 목록 | 입대타이밍",
  description: "특기를 누르면 신체조건, 지원 자격·면허·전공, 회차별 경쟁률을 볼 수 있어요.",
  alternates: { canonical: "/mos" },
};

// 서버에서 만든 특기 목록을 브라우저 화면(MosIndex)에 바로 넘긴다.
// API를 기다리는 동안 특기 링크 380여 개가 화면에서 사라지면 검색엔진이 특기 페이지를 따라가지 못한다.
function initialList() {
  try {
    return { url: "/api/mos", data: JSON.parse(JSON.stringify({ ...meta(), items: mosIndex() })) };
  } catch {
    return undefined;
  }
}

export default function Page() {
  return (
    <ClientOnly fallback={<MosIndexSummary />}>
      <MosIndex initial={initialList()} />
    </ClientOnly>
  );
}
