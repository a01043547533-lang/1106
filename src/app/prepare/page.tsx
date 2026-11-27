import type { Metadata } from "next";
import { Prepare as Prepare } from "@/legacy/pages/Misc.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "입대 준비 체크리스트 | 입대타이밍",
  description: "지원 전, 합격 후, 입영 당일까지 순서대로 챙길 것을 모았어요. 체크박스는 이 화면에서만 표시되고 저장되지 않아요.",
  alternates: { canonical: "/prepare" },
};

export default function Page() {
  return (
    <ClientOnly fallback={
      <article>
        <h1>입대 준비 체크리스트</h1>
        <p className="lead">모집병 지원 전부터 최종 합격과 입영 당일까지 챙길 항목을 순서대로 정리했어요. 화면의 체크박스는 저장되지 않아요.</p>
        <section>
          <h2>입대 전 확인할 사항</h2>
          <ol>
            <li>지원 전: 병무청 본인인증, 특기별 신체조건과 자격·면허·학력 증빙을 확인하세요.</li>
            <li>합격 후: 요구 서류 제출 기한, 입영판정검사, 입영통지서와 집결 시간 및 장소를 확인하세요.</li>
            <li>입영 전: 학교 휴학과 직장 일정, 개인 서비스 정리, 공식 안내에 따른 훈련소 준비물을 챙기세요.</li>
          </ol>
        </section>
        <p><a href="/find">특기 찾기</a> · <a href="/training">훈련소 준비물</a> · <a href="/service">전역일 계산기</a></p>
      </article>
    }>
      <Prepare />
    </ClientOnly>
  );
}
