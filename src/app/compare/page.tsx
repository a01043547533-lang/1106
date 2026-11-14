import type { Metadata } from "next";
import Compare from "@/legacy/pages/Compare.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "특기 비교함 | 입대타이밍",
  description: "후보 특기를 최대 3개까지 담아 복무기간, 신체조건, 지원률 흐름을 나란히 비교해요. 목록은 이 브라우저에만 저장돼요.",
  alternates: { canonical: "/compare" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Compare />
    </ClientOnly>
  );
}
