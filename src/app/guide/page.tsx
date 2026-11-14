import type { Metadata } from "next";
import { GuideIndex as GuideIndex } from "@/legacy/pages/Guide.jsx";

export const metadata: Metadata = {
  title: "입대 가이드 | 입대타이밍",
  description: "처음 모집병에 지원하는 사람이 헷갈리기 쉬운 제도와 용어를 글로 풀었어요. 규칙은 병무청 안내 원문을 인용하고 출처를 함께 적어요.",
  alternates: { canonical: "/guide" },
};

export default function Page() {
  return <GuideIndex />;
}
