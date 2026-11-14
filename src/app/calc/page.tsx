import type { Metadata } from "next";
import Calc from "@/legacy/pages/Calc.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "예상 배점 계산기 | 입대타이밍",
  description: "특기를 고르고 자격·전공·면허 항목을 선택하면 병무청 선발배점기준으로 예상 합계를 계산해요. 보유 자격을 고르면 인정 등급을 자동으로 맞춰 줘요.",
  alternates: { canonical: "/calc" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Calc />
    </ClientOnly>
  );
}
