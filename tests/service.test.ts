import { describe, expect, it } from "vitest";
import { addMonths, isYMD, firstOfMonthPlus, diffDays } from "@/lib/date";
import { calcService } from "@/lib/service";
import { isOffDay, previousWorkday } from "@/lib/holidays";

describe("date", () => {
  it("말일 넘침", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2027-11-30", 3)).toBe("2028-02-29");
  });
  it("형식 검사", () => {
    expect(isYMD("2026-02-30")).toBe(false);
    expect(isYMD("2026-02-03")).toBe(true);
  });
  it("달 1일 기준 더하기", () => {
    expect(firstOfMonthPlus("2026-02-03", 2)).toBe("2026-04-01");
    expect(firstOfMonthPlus("2026-11-20", 2)).toBe("2027-01-01");
  });
});

describe("육군 2026-02-03 입대 (실제 사례: 2026-11 상병, 전역 2027-08-02)", () => {
  const r = calcService({ enlist: "2026-02-03", branch: "army", monthlySaving: 550_000, today: "2026-11-14" });

  it("전역일", () => {
    expect(r.service.discharge).toBe("2027-08-02");
  });
  it("진급일", () => {
    const d = Object.fromEntries(r.promotions.map((p) => [p.rank, p.date]));
    expect(d).toEqual({ pvt: "2026-02-03", pfc: "2026-04-01", cpl: "2026-10-01", sgt: "2027-04-01" });
  });
  it("오늘은 상병", () => {
    expect(r.progress?.rankKo).toBe("상병");
    expect(r.progress?.dDayDischarge).toBe(diffDays("2026-11-14", "2027-08-02"));
  });
  it("입대한 달은 일할 계산", () => {
    const feb = r.pay.months[0];
    expect(feb.month).toBe("2026-02");
    expect(feb.days).toBe(26);
    expect(feb.fullMonth).toBe(false);
    expect(feb.pay).toBe(Math.floor((feb.basePay * 26) / 28));
  });
  it("달 수 = 입대 달 ~ 전역 달", () => {
    expect(r.pay.months.length).toBe(19);
    expect(r.pay.months.at(-1)!.month).toBe("2027-08");
  });
  it("적금: 입대 다음 달부터, 매칭 포함", () => {
    expect(r.savings).not.toBeNull();
    expect(r.savings!.months).toBe(18);
    expect(r.savings!.total).toBe(r.savings!.principal + r.savings!.interest + r.savings!.matching);
  });
  it("휴가 나눔 합 = 연가", () => {
    expect(r.leave.split.reduce((s, x) => s + x.suggestDays, 0)).toBe(r.leave.annualLeaveDays);
  });
  it("주요 날짜는 시간 순", () => {
    const ds = r.keyDates.map((k) => k.date);
    expect([...ds].sort()).toEqual(ds);
  });
});

describe("군별 복무기간", () => {
  it.each([
    ["army", "2027-01-05", "2028-07-04"],
    ["marine", "2027-01-05", "2028-07-04"],
    ["navy", "2027-01-05", "2028-09-04"],
    ["airforce", "2027-01-05", "2028-10-04"],
    ["social", "2027-01-05", "2028-10-04"],
  ] as const)("%s %s 입대 → 명목 전역일 %s", (branch, enlist, expected) => {
    const r = calcService({ enlist, branch });
    expect(r.service.nominalDischarge).toBe(expected);
  });
});

describe("공휴일", () => {
  it("주말·공휴일 판정", () => {
    expect(isOffDay("2026-11-14")).toBe(true); // 토
    expect(isOffDay("2026-11-16")).toBe(false); // 월
    expect(isOffDay("2027-01-01")).toBe(true); // 신정
  });
  it("앞 평일로", () => {
    expect(previousWorkday("2026-11-15")).toBe("2026-11-13");
  });
});

describe("수료식", () => {
  it("육군훈련소 2026-10-19(월) 입영 → 11-24(화) 수료 (훈련소 행사일정)", () => {
    const r = calcService({ enlist: "2026-10-19", branch: "army", center: "nonsan" });
    expect(r.training?.graduation).toBe("2026-11-24");
    expect(r.training?.graduationExact).toBe(true);
  });
  it("사단 신교대는 6주차 수요일", () => {
    const r = calcService({ enlist: "2026-10-19", branch: "army", center: "division" });
    expect(r.training?.graduationExact).toBe(true);
    expect(r.training?.graduation).toBe("2026-11-25");
  });
  it("12사단 공식 일정표와 일치 (2026-02-02 입소 → 03-11, 10-12 입소 → 11-18)", () => {
    expect(calcService({ enlist: "2026-02-03", branch: "army", center: "division", division: "12" }).training?.graduation).toBe("2026-03-11");
    expect(calcService({ enlist: "2026-10-12", branch: "army", center: "division", division: "12" }).training?.graduation).toBe("2026-11-18");
  });
  it("요일 근거가 부족한 사단(50사단)은 주간으로", () => {
    const r = calcService({ enlist: "2026-10-19", branch: "army", center: "division", division: "50" });
    expect(r.training?.graduationExact).toBe(false);
    expect(r.training?.graduation).toBe("2026-11-23");
    expect(r.training?.graduationWeekEnd).toBe("2026-11-27");
  });
  it("사회복무요원 목요일 입영 → 3주 뒤 목요일", () => {
    const r = calcService({ enlist: "2026-11-05", branch: "social", center: "social" });
    expect(r.training?.graduation).toBe("2026-11-26");
  });
});

describe("전역일 안내", () => {
  it("주말 전역일은 날짜를 옮기지 않고 안내만", () => {
    // 2025-12-07 입대 → 2027-06-06(일, 현충일)
    const r = calcService({ enlist: "2025-12-07", branch: "army" });
    expect(r.service.nominalDischarge).toBe("2027-06-06");
    expect(r.service.discharge).toBe("2027-06-06");
    expect(r.service.dischargeNote).toContain("현충일");
  });
  it("평일 전역일은 안내 없음", () => {
    const r = calcService({ enlist: "2026-02-03", branch: "army" });
    expect(r.service.dischargeNote).toBeNull();
  });
  it("첫 휴가는 수료식 뒤", () => {
    const r = calcService({ enlist: "2026-10-19", branch: "army", center: "nonsan" });
    expect(r.leave.firstLeave.notBefore).toBe("2026-11-24");
  });
});

describe("말일 입대 (민법 160조: 끝 달에 같은 날이 없으면 그 달 말일)", () => {
  it.each([
    ["2026-03-31", "army", "2027-09-30"],
    ["2026-05-31", "army", "2027-11-30"],
    ["2026-08-31", "army", "2028-02-29"],
    ["2026-07-31", "airforce", "2028-04-30"],
    ["2026-01-31", "army", "2027-07-30"],
    ["2026-03-01", "army", "2027-08-31"],
  ] as const)("%s %s → %s", (enlist, branch, expected) => {
    expect(calcService({ enlist, branch }).service.discharge).toBe(expected);
  });
});
