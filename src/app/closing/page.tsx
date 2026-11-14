import type { Metadata } from "next";
import Closing from "@/legacy/pages/Closing.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "마감 임박 미달 특기 | 입대타이밍",
  description: "접수 마감이 가까운데 아직 지원자가 모집인원보다 적은 특기만 모았어요. 30초마다 갱신되고, 마감 직전에는 숫자가 빠르게 바뀌어요.",
  alternates: { canonical: "/closing" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Closing />
    </ClientOnly>
  );
}
