import type { Metadata } from "next";
import Plan from "@/legacy/pages/Plan.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "입영월별 모집병 플래너 | 입대타이밍",
  description: "복귀 희망 월(복학·복직)만 넣으면 그에 맞는 입영월과 그 달에 입영하는 모집 회차를 보여 줘요. 입영월을 직접 골라도 돼요.",
  alternates: { canonical: "/plan" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Plan />
    </ClientOnly>
  );
}
