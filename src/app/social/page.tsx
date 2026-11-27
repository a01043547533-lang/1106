import type { Metadata } from "next";
import { Social as Social } from "@/legacy/pages/Misc.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "사회복무요원 복무기관 찾기·소집 일정 | 입대타이밍",
  description: "병역판정검사에서 4급(보충역)을 받으면 사회복무요원으로 복무해요. 소집신청 기간에 원하는 기관을 골라 신청할 수 있어요.",
  alternates: { canonical: "/social" },
};

export default function Page() {
  return (
    <ClientOnly fallback={
      <article>
        <h1>사회복무요원 복무기관 찾기·소집 일정</h1>
        <p className="lead">사회복무요원 소집을 준비하는 사람이 관할 지역과 기관 유형에 따른 복무기관 정보를 찾아보고 소집 일정을 확인할 수 있는 페이지예요.</p>
        <section>
          <h2>복무기관과 소집 일정 확인 방법</h2>
          <ol>
            <li>관할 지방병무청과 희망 지역, 기관 유형을 기준으로 복무기관을 검색하세요.</li>
            <li>기관의 이름과 주소를 확인한 뒤 병무청 본인선택 공고에서 실제 신청 가능한 기관과 인원을 확인하세요.</li>
            <li>소집 예정일과 복무 종료 예상 시점을 비교하세요. 개인별 소집 자격과 최종 일정은 병무청 안내를 따르세요.</li>
          </ol>
        </section>
        <p><a href="/calendar">병무청 모집·소집 일정</a> · <a href="/prepare">입대 준비 체크리스트</a> · <a href="/alerts">일정 놓치지 않는 법</a></p>
      </article>
    }>
      <Social />
    </ClientOnly>
  );
}
