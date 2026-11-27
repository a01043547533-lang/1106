import type { Metadata } from "next";
import Plan from "@/legacy/pages/Plan.jsx";
import ClientOnly from "@/legacy/ClientOnly.jsx";

export const metadata: Metadata = {
  title: "입영월별 모집병 플래너 | 입대타이밍",
  description: "복귀 희망 월(복학·복직)만 넣으면 그에 맞는 입영월과 그 달에 입영하는 모집 회차를 보여 줘요. 입영월을 직접 골라도 돼요.",
  alternates: { canonical: "/plan" },
};

export default function Page() {
  return (
    <ClientOnly fallback={
      <article>
        <h1>입영월별 모집병 플래너</h1>
        <p className="lead">복학·복직이나 전역 희망 월을 기준으로 입영 가능한 달을 계산하고, 해당 입영월의 모집병 회차와 접수 일정을 비교할 수 있어요.</p>
        <section>
          <h2>입영월을 계획하는 두 가지 방법</h2>
          <ul>
            <li>복귀 희망 월 기준: 돌아오려는 달에서 희망 군의 복무기간과 전역 후 여유 기간을 빼서 입영월을 계산해요.</li>
            <li>전역 희망 월 기준: 복무기간을 고려해 입영 시점을 계산하거나, 원하는 입영월을 직접 선택해요.</li>
          </ul>
        </section>
        <section>
          <h2>모집 회차와 접수 일정 확인</h2>
          <p>입영월을 최대 세 개까지 골라 접수 중인 회차와 접수 예정 회차를 비교해요. 입영월이 정해지지 않은 회차는 실시간 접수현황에서 별도로 확인하세요. 아직 공고가 없는 일정은 확정된 날짜로 안내하지 않아요.</p>
        </section>
        <p><a href="/calendar">모집병 접수 일정</a> · <a href="/now">지금 접수 중인 모집병</a> · <a href="/service">전역일 계산기</a></p>
      </article>
    }>
      <Plan />
    </ClientOnly>
  );
}
