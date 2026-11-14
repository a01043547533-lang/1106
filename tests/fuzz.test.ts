// 계산 엔진 전수 검사: 2020~2035년 모든 날짜 × 모든 군, 사단은 주 단위로.
// 항상 지켜져야 하는 규칙(불변식)이 하나라도 깨지면 실패한다.
import { describe, expect, it } from "vitest";
import { calcService } from "@/lib/service";
import { addDays, diffDays, month, year } from "@/lib/date";
import { getCenter } from "@/lib/centers";
import { BRANCHES } from "@/rules/types";

const START = "2020-01-01";
const END = "2035-12-31";

function days(step: number): string[] {
  const out: string[] = [];
  for (let d = START; d <= END; d = addDays(d, step)) out.push(d);
  return out;
}

function check(r: ReturnType<typeof calcService>, enlist: string, today?: string) {
  const fail = (m: string) => {
    throw new Error(`${enlist} ${r.input.branch} ${r.input.center ?? ""}: ${m}`);
  };
  const s = r.service;
  // 민법 160조를 따로 구현해 대조: 마지막 달에 같은 날짜가 없으면 그 달 말일
  const [ey, em, ed] = enlist.split("-").map(Number);
  const tot = ey * 12 + em - 1 + s.months;
  const ty = Math.floor(tot / 12);
  const tm = (tot % 12) + 1;
  const mm = String(tm).padStart(2, "0");
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const want = ed > lastDay ? `${ty}-${mm}-${lastDay}` : addDays(`${ty}-${mm}-${String(ed).padStart(2, "0")}`, -1);
  if (s.nominalDischarge !== want) fail(`전역일 공식 ${s.nominalDischarge} vs ${want}`);
  if (!(s.discharge > enlist)) fail("전역일이 입대일보다 앞");
  if (s.days !== diffDays(enlist, s.discharge) + 1) fail("복무일수");

  // 진급: 입대일로 시작, 시간 순, 전역일 이전, 매월 1일
  if (r.promotions[0].date !== enlist || r.promotions[0].rank !== "pvt") fail("이병 시작");
  for (let i = 1; i < r.promotions.length; i++) {
    const p = r.promotions[i];
    if (!(p.date > r.promotions[i - 1].date)) fail("진급 순서");
    if (p.date > s.discharge) fail("진급일이 전역 뒤");
    if (!p.date.endsWith("-01")) fail("진급일이 1일이 아님");
  }

  // 달별: 이어지고, 입대 달~전역 달, 일수 합 = 복무일수, 금액 정상
  const ms = r.pay.months;
  if (ms[0].month !== enlist.slice(0, 7)) fail("첫 달");
  if (ms.at(-1)!.month !== s.discharge.slice(0, 7)) fail("마지막 달");
  const expectedMonths = (year(s.discharge) - year(enlist)) * 12 + month(s.discharge) - month(enlist) + 1;
  if (ms.length !== expectedMonths) fail("달 수");
  if (ms.reduce((a, m) => a + m.days, 0) !== s.days) fail("일수 합");
  for (const m of ms) {
    if (!Number.isFinite(m.pay) || m.pay < 0 || m.pay > m.basePay) fail(`봉급 이상 ${m.month}`);
    if (!Number.isFinite(m.allowance) || m.allowance < 0) fail("수당 이상");
    if (m.matching > m.deposit) fail("매칭이 납입보다 큼");
  }
  if (r.pay.totalPay !== ms.reduce((a, m) => a + m.pay, 0)) fail("봉급 합계");

  // 적금
  if (r.savings) {
    const v = r.savings;
    if (v.total !== v.principal + v.interest + v.matching) fail("적금 합계");
    if (v.months !== ms.length - 1) fail(`적금 개월 ${v.months} vs ${ms.length - 1}`);
    if (!Number.isFinite(v.interest) || v.interest < 0) fail("이자 이상");
  }

  // 휴가 나눔 합 = 연가, 음수 없음
  const sum = r.leave.split.reduce((a, x) => a + x.suggestDays, 0);
  if (sum !== r.leave.annualLeaveDays) fail("휴가 합");
  if (r.leave.split.some((x) => x.suggestDays < 0)) fail("휴가 음수");

  // 주요 날짜 시간 순
  const kd = r.keyDates.map((k) => k.date);
  if (kd.join() !== [...kd].sort().join()) fail("주요 날짜 순서");

  // 수료식: 입대 뒤 3~8주 안, 첫 휴가는 수료일 뒤
  if (r.training) {
    const g = diffDays(enlist, r.training.graduation);
    if (g < 14 || g > 56) fail(`수료식 간격 ${g}일`);
    if (r.leave.firstLeave.notBefore !== r.training.graduation) fail("첫 휴가 기준");
  }

  // 전역 뒤
  if (!(r.afterDischarge.semesterStart > s.discharge)) fail("복학 학기");
  if (r.afterDischarge.reserve[0].year !== year(s.discharge) + 1) fail("예비군 1년차");

  // 진행 상황
  if (today && r.progress) {
    const p = r.progress;
    if (p.percent < 0 || p.percent > 100) fail("진행률");
    if (p.phase === "serving" && (p.dDayDischarge < 0 || p.served < 1)) fail("복무 중 값");
  }
}

describe("전수 검사", () => {
  it("모든 날짜 × 모든 군 (적금 55만, 기본 훈련소)", () => {
    let n = 0;
    for (const d of days(1)) {
      for (const b of BRANCHES) {
        const center = { army: "nonsan", marine: "marine", navy: "navy", airforce: "airforce", social: "social" }[b];
        check(calcService({ enlist: d, branch: b, center, monthlySaving: 550_000 }), d);
        n++;
      }
    }
    expect(n).toBeGreaterThan(29_000);
  }, 120_000);

  it("사단 16곳 × 주 단위 날짜, 오늘 기준일 여러 개", () => {
    const divs = getCenter("division")!.divisions!;
    const todays = ["2026-11-14", "2020-01-01", "2035-12-31"];
    for (const d of days(7)) {
      for (const dv of divs) {
        for (const t of todays) check(calcService({ enlist: d, branch: "army", center: "division", division: dv.id, today: t }), d, t);
      }
    }
  }, 120_000);

  it("적금 금액 경계 (0, 5만, 한도 초과)", () => {
    for (const d of days(31)) {
      for (const s of [0, 50_000, 550_000, 9_999_999]) {
        const r = calcService({ enlist: d, branch: "social", center: "social", monthlySaving: s });
        check(r, d);
        if (s === 0 && r.savings) throw new Error("0원인데 적금 계산됨");
        if (s > 0 && r.savings!.principal > r.savings!.months * 550_000) throw new Error("한도 초과 납입");
      }
    }
  }, 60_000);
});
