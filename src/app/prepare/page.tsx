import type { Metadata } from "next";
import { Prepare as Prepare } from "@/legacy/pages/Misc.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "입대 준비 체크리스트 | 입대타이밍",
  description: "지원 전, 합격 후, 입영 당일까지 순서대로 챙길 것을 모았어요. 체크박스는 이 화면에서만 표시되고 저장되지 않아요.",
  alternates: { canonical: "/prepare" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Prepare />
    </ClientOnly>
  );
}
