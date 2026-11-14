import type { Metadata } from "next";
import Cert from "@/legacy/pages/Cert.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "자격증 준비 도우미 · 모집병 배점 자격증과 시험 일정 | 입대타이밍",
  alternates: { canonical: "/cert" },
  description: "모집병 배점에 들어가는 자격증, 공식 접수 사이트, 올해 국가기술자격 정기 시험 일정과 예상 배점 계산기를 한곳에 모았어요.",
};

export default function Page() {
  return (
    <ClientOnly>
      <Cert />
    </ClientOnly>
  );
}
