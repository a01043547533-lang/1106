import type { Metadata } from "next";
import Cert from "@/legacy/pages/Cert.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "자격증 준비 도우미 · 모집병 배점 자격증과 시험 일정 | 입대타이밍",
  alternates: { canonical: "/cert" },
  description: "모집병 배점에 들어가는 자격증, 공식 접수 사이트, 올해 국가기술자격 정기 시험 일정과 예상 배점 계산기를 한곳에 모았어요.",
};

export default function Page() {
  return (
    <ClientOnly fallback={
      <article>
        <h1>자격증 준비 도우미</h1>
        <p className="lead">모집병 지원에 인정되는 자격증과 면허, 국가기술자격 시험 일정을 확인하고 특기별 예상 배점을 계산할 수 있어요.</p>
        <section>
          <h2>자격증 준비 순서</h2>
          <ol>
            <li>지원할 특기의 자격·면허 인정 기준을 먼저 확인하세요. 같은 자격증도 특기에 따라 인정 여부와 배점이 달라요.</li>
            <li>시험 접수일뿐 아니라 최종 합격 발표일을 모집병 접수 마감일과 비교하세요.</li>
            <li>보유 자격을 예상 배점 계산기에 넣어 확인하고, 인정 기한과 증빙 서류는 해당 모집 공고에서 최종 확인하세요.</li>
          </ol>
        </section>
        <p><a href="/mos">군별 특기 목록</a> · <a href="/calc">예상 배점 계산기</a> · <a href="/guide/score-basics">자격·면허 배점 안내</a></p>
      </article>
    }>
      <Cert />
    </ClientOnly>
  );
}
