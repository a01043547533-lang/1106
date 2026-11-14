import type { Metadata } from "next";
import Find from "@/legacy/pages/Find.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "내 조건으로 갈 수 있는 군 특기 찾기 | 입대타이밍",
  description: "키·몸무게·시력·신체등급과 가진 자격을 넣으면 지원할 수 있는 특기와 안 되는 이유를 알려 줘요. 전부 비워도 검색돼요.",
  alternates: { canonical: "/find" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Find />
    </ClientOnly>
  );
}
