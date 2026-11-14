import type { Metadata } from "next";
import Calendar from "@/legacy/pages/Calendar.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "모집병·사회복무요원·카투사 접수 일정 | 입대타이밍",
  description: "다가오는 일정을 시간순으로 모았어요. 날짜는 병무청 공고 원문에서 옮긴 값만 쓰고, 공고 전인 종류(일반병 입영일자 본인선택 등)는 일정이 나오면 탭이 생겨요.",
  alternates: { canonical: "/calendar" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Calendar />
    </ClientOnly>
  );
}
