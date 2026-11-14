import type { Metadata } from "next";
import { Alerts as Alerts } from "@/legacy/pages/Misc.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "접수 일정 놓치지 않는 법 | 입대타이밍",
  description: "모집병 접수는 보통 며칠 안에 끝나고, 카투사와 사회복무요원 소집신청은 1년에 한 번뿐이에요. 일정을 챙기는 방법을 정리했어요.",
  alternates: { canonical: "/alerts" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Alerts />
    </ClientOnly>
  );
}
