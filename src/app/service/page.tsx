import type { Metadata } from "next";
import ServiceCalc from "@/components/ServiceCalc";

export const metadata: Metadata = {
  title: "전역일 계산기 2026 · 진급일·군인 월급·적금 계산 | 입대타이밍",
  alternates: { canonical: "/service" },
  description: "입대일만 넣으면 전역일과 D-day, 일병·상병·병장 진급일, 달마다 받는 월급, 군적금 만기액, 휴가, 수료식 날짜, 복학 학기까지 계산해요.",
};

export default function Page() {
  return <ServiceCalc />;
}
