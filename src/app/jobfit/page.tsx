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
    <ClientOnly fallback={
      <article>
        <h1>취업맞춤특기병 입영일별 남은 자리</h1>
        <p className="lead">기술훈련을 받고 연관된 특기로 입대하는 취업맞춤특기병의 입영일별 모집인원, 선발인원과 남은 자리를 병무청 공개 자료로 확인해요.</p>
        <section>
          <h2>모집과 선발 현황 확인 방법</h2>
          <ol>
            <li>남은 자리는 모집인원에서 선발인원을 뺀 값이에요. 조회 시각에 따라 달라질 수 있어요.</li>
            <li>희망 군과 특기, 입영일을 비교하고 해당 회차의 모집 공고를 확인하세요.</li>
            <li>지원 뒤 필요한 기술훈련을 이수해야 해요. 구체적인 지원 자격과 훈련 요건은 병무청 공고를 따르세요.</li>
          </ol>
        </section>
        <p><a href="/mos">군사특기별 정보</a> · <a href="/calendar">접수 일정</a> · <a href="/now">현재 접수현황</a></p>
      </article>
    }>
      <Jobfit />
    </ClientOnly>
  );
}
