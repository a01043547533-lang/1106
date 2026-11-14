import type { Metadata } from "next";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "군 복무 계산 API | 입대타이밍",
  alternates: { canonical: "/developers" },
  description: "입대일로 전역일·진급일·월급·적금·휴가를 돌려주는 무료 JSON API와 훈련소 준비물 API 안내.",
};

const ENDPOINTS: [string, string, string][] = [
  ["/api/v1/service?enlist=2026-02-03&branch=army&saving=550000&center=nonsan", "전역일, 진급일, 달별 봉급, 적금 만기, 휴가, 수료식 예상, 복학 학기, 예비군", "enlist(필수) · branch(army·marine·navy·airforce·social) · saving · center · division(사단 번호) · today"],
  ["/api/v1/checklist?center=division&enlist=2026-12-07", "훈련소별 서류·준비물·지급품·반입 금지, 사단 신교대 정보", "center · enlist(선택)"],
  ["/api/v1/todo?enlist=2026-12-07", "입대 D-30·14·7·3·1 할 일과 날짜", "enlist(필수)"],
  ["/api/v1/centers", "훈련소 id 목록", "-"],
  ["/api/v1/rules?year=2026", "그 해 봉급표·적금·복무기간 규정 원본", "year(선택)"],
  ["/api/v1/holidays?year=2027", "법정공휴일(대체공휴일 포함)", "year(선택)"],
  ["/api/v1/calendar?enlist=2026-02-03&branch=army", "진급·수료·전역일 .ics 캘린더 파일", "enlist · branch · center · division"],
];

export default function Page() {
  return (
    <>
      <PageHeading title="군 복무 계산 API" description="키 없이 GET으로 불러요. 응답은 JSON이고 모든 계산 결과에 기준 연도와 출처가 붙어요. 다른 사이트에서 불러도 돼요(CORS 허용)." />
      {ENDPOINTS.map(([path, what, params]) => (
        <section key={path} className="card">
          <h2 className="small sv-code"><a href={path}>GET {path}</a></h2>
          <p>{what}</p>
          <p className="muted small">{params}</p>
        </section>
      ))}
    </>
  );
}
