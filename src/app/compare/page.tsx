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
    <ClientOnly fallback={
      <article>
        <h1>특기 비교함</h1>
        <p className="lead">지원 후보 특기를 최대 세 개까지 담아 복무기간, 신체조건, 지원률 흐름을 나란히 확인할 수 있어요. 담은 목록은 이 브라우저에만 저장돼요.</p>
        <section>
          <h2>특기를 비교할 때 확인할 항목</h2>
          <ol>
            <li>먼저 신체조건과 필수 자격을 충족하는지 살펴보세요.</li>
            <li>희망 입영월과 복무기간이 학업이나 취업 계획에 맞는지 비교하세요.</li>
            <li>현재 지원률과 과거 지원률은 참고 자료예요. 지원률이 낮다고 최종 합격이 보장되지는 않아요.</li>
          </ol>
        </section>
        <p><a href="/mos">특기 목록</a> · <a href="/find">내 조건으로 특기 찾기</a> · <a href="/plan">입영월 플래너</a></p>
      </article>
    }>
      <Compare />
    </ClientOnly>
  );
}
