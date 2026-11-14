import type { Metadata } from "next";
import { Social as Social } from "@/legacy/pages/Misc.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "사회복무요원 복무기관 찾기·소집 일정 | 입대타이밍",
  description: "병역판정검사에서 4급(보충역)을 받으면 사회복무요원으로 복무해요. 소집신청 기간에 원하는 기관을 골라 신청할 수 있어요.",
  alternates: { canonical: "/social" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Social />
    </ClientOnly>
  );
}
