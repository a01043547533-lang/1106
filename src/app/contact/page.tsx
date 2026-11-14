import type { Metadata } from "next";
import { Contact as Contact } from "@/legacy/pages/Misc.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "문의하기 | 입대타이밍",
  description: "자료 오류, 정정 요청, 광고·제휴 문의를 받아요. 병역 상담은 병무청으로 해 주세요.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/contact" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Contact />
    </ClientOnly>
  );
}
