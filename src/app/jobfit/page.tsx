import type { Metadata } from "next";
import Jobfit from "@/legacy/pages/Jobfit.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "취업맞춤특기병 입영일별 남은 자리 | 입대타이밍",
  description: "기술훈련을 받고 연관 특기로 입대하는 취업맞춤특기병의 입영일별 모집인원, 선발인원, 남은 자리예요. 병무청 공개 데이터를 10분마다 새로 받아요.",
  alternates: { canonical: "/jobfit" },
};

export default function Page() {
  return (
    <ClientOnly>
      <Jobfit />
    </ClientOnly>
  );
}
