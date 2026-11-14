import type { Metadata } from "next";
import Now from "@/legacy/pages/Now.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "지금 접수 중인 모집병 실시간 지원률 | 입대타이밍",
  description: "지원률 = 접수인원 ÷ 모집인원이에요. 1.0 미만은 미달, 3.0 이상은 붐빔으로 표시해요.",
  alternates: { canonical: "/now" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Now />
    </ClientOnly>
  );
}
