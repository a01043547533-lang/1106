// 군인 월급표 (2탄). 규정 파일 숫자를 그대로 보여 준다. "2027 군인 월급" 검색 수요를 받되 없는 숫자는 만들지 않는다.
import Link from "next/link";
import { allRules } from "@/rules";
import { RANK_KO, type Rank } from "@/rules/types";
import { won } from "@/lib/format";
import { PageHeading } from "@/components/PageHeading";

const RANKS: Rank[] = ["pvt", "pfc", "cpl", "sgt"];

export default function Pay() {
  const rules = allRules();
  const r26 = rules.find((r) => r.year === 2026)!;
  const s = r26.savings;
  const social = r26.social;
  return (
    <>
      <PageHeading
        title="군인 월급 2026 · 이병부터 병장까지"
        description="계급별 병 봉급, 훈련병·사회복무요원(공익) 월급, 월급날, 장병내일준비적금 매칭까지 한 표로 정리했어요. 2027년 금액은 발표되면 바로 바꿔요."
      />

      <section className="card">
        <h2>계급별 월급</h2>
        <div className="table-wrap">
          <table className="grid sv-grid">
            <thead>
              <tr>
                <th>계급</th>
                {rules.map((r) => (
                  <th key={r.year}>{r.year}년</th>
                ))}
                <th>적금 넣으면 (최대)</th>
              </tr>
            </thead>
            <tbody>
              {RANKS.map((k) => (
                <tr key={k}>
                  <td>
                    <b>{RANK_KO[k]}</b>
                  </td>
                  {rules.map((r) => (
                    <td key={r.year} className="num">
                      {r.status === "confirmed" ? won(r.pay[k]) : <span className="muted">발표 전</span>}
                    </td>
                  ))}
                  <td className="num">
                    {won(r26.pay[k])} + 매칭 {won(Math.min(s.matchingMonthlyCap, s.monthlyCapPerPerson * s.matchingRate))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          {r26.basis}. 2027년 병 봉급은 아직 발표되지 않았어요(국방예산 정부안 보도에도 병 봉급 수치가 없어요). 매칭지원금은 매달 받는 돈이
          아니라 전역할 때 적금과 함께 한꺼번에 받아요.
        </p>
      </section>

      <section className="card">
        <h2>자주 묻는 것</h2>
        <table>
          <tbody>
            <tr>
              <th>훈련병 월급</th>
              <td>훈련병도 이병 봉급({won(r26.pay.pvt)})을 받아요. 입대한 달은 입대일부터 그달 말일까지 날짜만큼 나눠서 줘요.</td>
            </tr>
            <tr>
              <th>월급날</th>
              <td>매달 10일쯤 나라사랑카드 계좌로 들어와요. 첫 달은 일할 계산이라 적게 들어와요.</td>
            </tr>
            <tr>
              <th>진급하면</th>
              <td>진급은 매달 1일이라 진급한 달부터 그 계급 봉급을 받아요. 진급일은 전역일 계산기에서 날짜로 볼 수 있어요.</td>
            </tr>
            <tr>
              <th>사회복무요원(공익)</th>
              <td>
                현역병과 같은 금액을 소집된 달부터 센 기간으로 받아요(2개월까지 이병, 3~8개월 일병, 9~14개월 상병, 15개월부터 병장). 여기에 출근한 날마다
                중식비 {won(social.mealPerDay)}과 교통비(실비)가 더해져요.
              </td>
            </tr>
            <tr>
              <th>적금 한도</th>
              <td>
                은행별 월 {won(s.monthlyCapPerBank)}, 두 은행 합쳐 월 {won(s.monthlyCapPerPerson)}까지. 정부가 넣은 돈의 100%를 더 줘요. 사회복무요원도
                가입할 수 있어요.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card goal-box">
        <h2>우리 아이는 지금까지 얼마 받았을까?</h2>
        <p>입대일을 넣으면 달마다 받는 봉급과 전역할 때 받는 적금까지 계산해 드려요.</p>
        <p>
          <Link className="button primary" href="/service">
            전역일 계산기로 계산하기 →
          </Link>
        </p>
      </section>

      <p className="muted small">
        출처:{" "}
        {r26.sources.slice(0, 3).map((x, i) => (
          <span key={x.url}>
            <a href={x.url} target="_blank" rel="noopener noreferrer">
              {x.label}
            </a>
            {i < 2 ? ", " : ""}
          </span>
        ))}
      </p>
    </>
  );
}
