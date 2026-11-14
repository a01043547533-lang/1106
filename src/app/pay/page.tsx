import type { Metadata } from "next";
import Pay from "@/components/Pay";

export const metadata: Metadata = {
  title: "군인 월급 2026 · 이병·일병·상병·병장·훈련병·공익 | 입대타이밍",
  alternates: { canonical: "/pay" },
  description: "2026년 계급별 병 봉급, 훈련병·사회복무요원 월급, 월급날, 장병내일준비적금 매칭까지 한 표로 정리했어요.",
};

export default function Page() {
  return <Pay />;
}
