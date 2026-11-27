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
    <ClientOnly fallback={
      <article>
        <h1>마감 임박 미달 특기</h1>
        <p className="lead">접수 마감이 가까운 모집병 특기 중 모집인원보다 지원자가 적은 특기를 찾아볼 수 있어요. 지원률은 접수인원을 모집인원으로 나눈 값입니다.</p>
        <section>
          <h2>마감 임박 특기를 확인하는 방법</h2>
          <ol>
            <li>마감까지 남은 기간을 24시간, 48시간, 7일 또는 접수 중 전체로 선택하세요.</li>
            <li>미달 특기만 보기에서 모집인원과 접수인원, 부족 인원, 마감 시각을 비교하세요.</li>
            <li>관심 특기의 지원 자격을 확인하고 병무청 모집 공고에서 최종 일정을 확인하세요.</li>
          </ol>
          <p>현재 미달이라고 합격이 보장되는 것은 아니에요. 마감 직전에도 지원률은 바뀔 수 있고 신체조건과 필수 자격 등 선발 기준을 충족해야 해요.</p>
        </section>
        <p><a href="/now">현재 모집병 접수현황</a> · <a href="/mos">군별 특기와 지원자격</a> · <a href="/guide/rate-reading">지원률 읽는 법</a></p>
      </article>
    }>
      <Closing />
    </ClientOnly>
  );
}
