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
    <ClientOnly fallback={
      <article>
        <h1>접수 일정 놓치지 않는 법</h1>
        <p className="lead">모집병 접수는 기간이 짧아 연간 모집계획과 회차별 공고를 함께 확인해야 해요. 카투사와 사회복무요원 소집신청은 별도로 일정을 관리하세요.</p>
        <section>
          <h2>접수 일정 관리 방법</h2>
          <ol>
            <li>병무청 공식 모집계획에서 접수 시작일, 마감일, 발표일과 입영월을 확인해요.</li>
            <li>접수 시작일과 마감 전날에 개인 달력 알림을 설정해요. 마감 직전에 지원률도 다시 확인하세요.</li>
            <li>이 사이트는 이메일이나 문자 알림을 보내지 않아요. 본인 일정과 통지서는 병무민원포털에서 확인하세요.</li>
          </ol>
        </section>
        <p><a href="/calendar">모집 일정</a> · <a href="/now">현재 접수현황</a> · <a href="/social">사회복무요원</a></p>
      </article>
    }>
      <Alerts />
    </ClientOnly>
  );
}
