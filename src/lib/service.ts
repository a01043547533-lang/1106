import {
  type YMD,
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  firstOfMonthPlus,
  maxYMD,
  minYMD,
  month,
  periodEnd,
  weekday,
  year,
  ymd,
} from "./date";
import { holidayName, isCovered, isOffDay, previousWorkday } from "./holidays";
import { rulesFor } from "@/rules";
import { type Branch, type Rank, RANK_KO } from "@/rules/types";
import { getCenter, getDivision, type Center, type Division } from "./centers";

export interface ServiceInput {
  enlist: YMD;
  branch: Branch;
  /** 장병내일준비적금 월 납입액(원). 0이면 계산 안 함 */
  monthlySaving?: number;
  /** 입대한 달로부터 몇 번째 달부터 넣는지(기본 1 = 입대 다음 달) */
  savingStartOffset?: number;
  /** 훈련소 id (수료식 예상용) */
  center?: string;
  /** 사단 신교대일 때 사단 번호 ("12") */
  division?: string;
  /** 진행 상황 기준일. 없으면 진행 상황을 빼고 돌려준다 */
  today?: YMD;
}

export interface Promotion {
  rank: Rank;
  rankKo: string;
  date: YMD;
}

export interface PayMonth {
  month: string; // "2026-02"
  rank: Rank;
  rankKo: string;
  days: number;
  fullMonth: boolean;
  basePay: number; // 그 계급 월 봉급
  pay: number; // 일할 계산한 봉급
  allowance: number; // 사회복무요원 중식비·교통비(예상)
  deposit: number; // 적금 납입
  matching: number; // 정부 매칭(전역 때 한꺼번에)
  ruleYear: number;
  estimated: boolean;
}

export interface KeyDate {
  key: string;
  label: string;
  date: YMD;
  estimated: boolean;
  note?: string;
}

const RANKS: Rank[] = ["pvt", "pfc", "cpl", "sgt"];

export function calcService(input: ServiceInput) {
  const { enlist, branch } = input;
  const { rules: enlistRules, estimated: enlistRulesEstimated } = rulesFor(year(enlist));
  const b = enlistRules.branches[branch];
  if (!b) throw new Error(`unknown branch: ${branch}`);

  // 1) 전역일
  const nominalDischarge = periodEnd(enlist, b.serviceMonths);
  let discharge = nominalDischarge;
  let dischargeNote: string | null = null;
  const holidayCovered = isCovered(nominalDischarge);
  if (enlistRules.dischargeAdjust.enabled && isOffDay(nominalDischarge)) {
    discharge = previousWorkday(nominalDischarge);
    const why = holidayName(nominalDischarge) ?? (weekday(nominalDischarge) === 0 ? "일요일" : "토요일");
    dischargeNote = `원래 전역일 ${nominalDischarge}이(가) ${why}이라 ${discharge}로 앞당겨져요. ${enlistRules.dischargeAdjust.note}`;
  } else if (isOffDay(nominalDischarge)) {
    const why = holidayName(nominalDischarge) ?? (weekday(nominalDischarge) === 0 ? "일요일" : "토요일");
    dischargeNote = `전역일이 ${why}이에요. ${enlistRules.dischargeAdjust.note}`;
  }

  // 2) 진급일 (입대한 달을 1개월로 센다)
  const p = b.promotionMonths;
  const promoAll: Promotion[] = [
    { rank: "pvt", rankKo: RANK_KO.pvt, date: enlist },
    { rank: "pfc", rankKo: RANK_KO.pfc, date: firstOfMonthPlus(enlist, p.pvt) },
    { rank: "cpl", rankKo: RANK_KO.cpl, date: firstOfMonthPlus(enlist, p.pvt + p.pfc) },
    { rank: "sgt", rankKo: RANK_KO.sgt, date: firstOfMonthPlus(enlist, p.pvt + p.pfc + p.cpl) },
  ];
  const promotions = promoAll.filter((x) => x.rank === "pvt" || x.date <= discharge);

  const rankOn = (d: YMD): Rank => {
    let r: Rank = "pvt";
    for (const x of promotions) if (x.date <= d) r = x.rank;
    return r;
  };

  // 3) 달마다 받는 돈
  const startOffset = input.savingStartOffset ?? 1;
  const monthlySaving = Math.max(0, Math.floor(input.monthlySaving ?? 0));
  const months: PayMonth[] = [];
  let cursor = ymd(year(enlist), month(enlist), 1);
  let idx = 0;
  while (cursor <= discharge) {
    const y = year(cursor);
    const m = month(cursor);
    const dim = daysInMonth(y, m);
    const start = maxYMD(cursor, enlist);
    const end = minYMD(ymd(y, m, dim), discharge);
    const days = diffDays(start, end) + 1;
    const { rules, estimated } = rulesFor(y);
    const rank = rankOn(start);
    const basePay = rules.pay[rank];
    const fullMonth = days === dim;
    const pay = fullMonth ? basePay : Math.floor((basePay * days) / dim);

    let allowance = 0;
    if (branch === "social") {
      const workDays = Math.round((rules.social.workDaysPerMonth * days) / dim);
      allowance = workDays * (rules.social.mealPerDay + rules.social.transportPerDay);
    }

    const canSave = branch !== "social" || rules.savings.socialEligible;
    let deposit = 0;
    let matching = 0;
    if (monthlySaving > 0 && canSave && idx >= startOffset) {
      deposit = Math.min(monthlySaving, rules.savings.monthlyCapPerPerson);
      matching = Math.min(Math.floor(deposit * rules.savings.matchingRate), rules.savings.matchingMonthlyCap);
    }

    months.push({
      month: `${y}-${String(m).padStart(2, "0")}`,
      rank,
      rankKo: RANK_KO[rank],
      days,
      fullMonth,
      basePay,
      pay,
      allowance,
      deposit,
      matching,
      ruleYear: rules.year,
      estimated,
    });
    cursor = addMonths(cursor, 1);
    idx++;
  }

  const totalPay = sum(months.map((x) => x.pay));
  const totalAllowance = sum(months.map((x) => x.allowance));

  // 4) 적금 만기 (월 적금 단리, 이자 비과세)
  const depMonths = months.filter((x) => x.deposit > 0);
  const n = depMonths.length;
  const principal = sum(depMonths.map((x) => x.deposit));
  const matchingTotal = sum(depMonths.map((x) => x.matching));
  const rate = enlistRules.savings.baseRate + enlistRules.savings.bonusRate;
  // 각 달 납입금이 만기까지 남은 개월 수만큼 이자가 붙는다
  const interest = Math.floor(
    sum(depMonths.map((x, i) => (x.deposit * rate * (n - i)) / 12)),
  );
  const savings =
    monthlySaving > 0
      ? {
          monthlyInput: monthlySaving,
          months: n,
          principal,
          interest,
          matching: matchingTotal,
          total: principal + interest + matchingTotal,
          rate,
          note: `${enlistRules.savings.note} 입대한 다음 달부터 넣는다고 가정했어요.`,
          capped: monthlySaving > enlistRules.savings.monthlyCapPerPerson,
        }
      : null;

  // 5) 휴가 (예시 나눔: 계급에 머무는 기간 비율대로)
  const totalDays = diffDays(enlist, discharge) + 1;
  const leaveSplit = RANKS.map((r, i) => {
    const from = promoAll[i].date;
    const to = i < 3 ? addDays(promoAll[i + 1].date, -1) : discharge;
    if (from > discharge) return null;
    const span = diffDays(from, minYMD(to, discharge)) + 1;
    return { rank: r, rankKo: RANK_KO[r], from, to: minYMD(to, discharge), days: span };
  }).filter(Boolean) as { rank: Rank; rankKo: string; from: YMD; to: YMD; days: number }[];
  const leaveTotal = b.annualLeaveDays;
  let given = 0;
  const leave = {
    annualLeaveDays: leaveTotal,
    note: b.leaveNote,
    firstLeave: {
      /** 첫 휴가는 빨라도 이 날 뒤 (수료일, 훈련소를 모르면 null) */
      notBefore: null as YMD | null,
      note: "첫 휴가(신병위로휴가) 날짜를 정한 공식 기준은 없어요. 수료하고 자대에 간 뒤 부대에서 정해요.",
    },
    split: leaveSplit.map((s, i) => {
      const share =
        i === leaveSplit.length - 1 ? leaveTotal - given : Math.round((leaveTotal * s.days) / totalDays);
      given += share;
      return { ...s, suggestDays: share };
    }),
  };

  // 6) 훈련소·수료식
  const center: Center | null = input.center ? getCenter(input.center) : null;
  const division = center ? getDivision(center.id, input.division) : null;
  const training = center ? trainingInfo(center, enlist, division) : null;
  if (training) leave.firstLeave.notBefore = training.graduation;

  // 7) 전역 후
  const afterDischarge = afterInfo(discharge, enlistRules.reserve.totalYears, enlistRules.reserve.note);

  // 8) 주요 날짜 모음 (캘린더·알림용)
  const keyDates: KeyDate[] = [
    { key: "enlist", label: "입대", date: enlist, estimated: false },
  ];
  if (training) {
    keyDates.push({
      key: "graduation",
      label: training.graduationExact ? `${center!.short} 수료식` : `${center!.short} 수료 주간`,
      date: training.graduation,
      estimated: true,
      note: training.graduationNote,
    });
  }
  for (const x of promotions.slice(1)) {
    keyDates.push({
      key: `promo-${x.rank}`,
      label: branch === "social" ? `${x.rankKo} 상당 보수 시작` : `${x.rankKo} 진급`,
      date: x.date,
      estimated: branch !== "social",
      note: branch === "social" ? "사회복무요원은 계급이 없고, 복무 개월 수에 따라 이 계급 봉급을 받아요" : "진급 심사에 따라 늦어질 수 있어요",
    });
  }
  const d100 = addDays(discharge, -100);
  if (d100 > enlist) keyDates.push({ key: "d100", label: "전역 D-100", date: d100, estimated: false });
  keyDates.push({ key: "discharge", label: "전역", date: discharge, estimated: false });
  keyDates.sort((a, b2) => a.date.localeCompare(b2.date));

  // 9) 오늘 기준 진행 상황
  const progress = input.today ? progressInfo(input.today, enlist, discharge, promotions, rankOn) : null;

  return {
    input: {
      enlist,
      branch,
      branchName: b.name,
      monthlySaving,
      center: center?.id ?? null,
    },
    service: {
      months: b.serviceMonths,
      days: totalDays,
      nominalDischarge,
      discharge,
      dischargeAdjusted: discharge !== nominalDischarge,
      dischargeNote,
      holidayDataCovered: holidayCovered,
    },
    promotions,
    pay: {
      months,
      totalPay,
      totalAllowance,
      note:
        branch === "social"
          ? "사회복무요원은 같은 기간 현역병 계급 기준 봉급에 중식비·교통비(출근일 기준)가 더해져요. 출근일은 달마다 다르니 예상치예요."
          : "봉급은 매달 10일쯤 들어오고, 입대한 달과 전역한 달은 복무한 날짜만큼 일할 계산해요.",
    },
    savings,
    leave,
    training,
    afterDischarge,
    keyDates,
    progress,
    meta: {
      basis: enlistRules.basis,
      rulesYear: enlistRules.year,
      estimated: enlistRulesEstimated || months.some((x) => x.estimated),
      sources: enlistRules.sources,
    },
  };
}

export type ServiceResult = ReturnType<typeof calcService>;

function sum(a: number[]): number {
  return a.reduce((s, x) => s + x, 0);
}

function trainingInfo(c: Center, enlist: YMD, dv: Division | null) {
  // 입영한 주(월요일 시작)를 1주차로 세어 weeks주차의 수료 요일
  const wd = weekday(enlist); // 0=일
  const monday = addDays(enlist, wd === 0 ? 1 : 1 - wd);
  const weekStart = addDays(monday, (c.weeks - 1) * 7);
  const gw = dv ? dv.graduationWeekday : c.graduationWeekday;
  const exact = gw >= 1;
  const graduation = exact ? addDays(weekStart, gw - 1) : weekStart;
  const holiday = exact ? holidayName(graduation) : null;
  return {
    centerId: c.id,
    centerName: dv ? `${dv.name} 신병교육대` : c.name,
    division: dv
      ? {
          id: dv.id,
          name: dv.name,
          nick: dv.nick,
          place: dv.place,
          command: dv.command,
          mmaUrl: dv.mmaUrl,
          cases: dv.cases,
          note: dv.note,
          warning: dv.warning,
        }
      : null,
    holidayWarning: holiday ? `예상 수료일이 ${holiday}이라 하루 앞이나 뒤로 바뀔 수 있어요.` : null,
    weeks: c.weeks,
    durationLabel: c.durationLabel,
    graduation,
    /** false면 graduation은 그 주 월요일이고 요일은 미확인 */
    graduationExact: exact,
    graduationWeekEnd: addDays(weekStart, 4),
    graduationNote: c.graduationNote,
    family: dv?.family || c.family,
    letterNote: c.letterNote,
    parcel: c.parcelNote,
    sources: c.sources,
  };
}

function afterInfo(discharge: YMD, reserveYears: number, reserveNote: string) {
  const y = year(discharge);
  // 전역일 다음에 처음 시작하는 학기 (1학기 3월 2일, 2학기 9월 1일)
  const candidates: { label: string; start: YMD }[] = [];
  for (let yy = y; yy <= y + 1; yy++) {
    candidates.push({ label: `${yy}년 1학기`, start: ymd(yy, 3, 2) });
    candidates.push({ label: `${yy}년 2학기`, start: ymd(yy, 9, 1) });
  }
  const next = candidates.find((c) => c.start > discharge)!;
  const daysBefore = diffDays(discharge, next.start);
  const reserve = Array.from({ length: reserveYears }, (_, i) => ({
    order: i + 1,
    year: y + 1 + i,
  }));
  return {
    returnSemester: next.label,
    semesterStart: next.start,
    daysUntilSemester: daysBefore,
    semesterNote:
      "학교마다 개강 뒤 일정 기간(보통 수업일수 1/4 전후) 안에 전역하면 그 학기에 복학할 수 있게 해 줘요. 학칙을 꼭 확인하세요.",
    reserve,
    reserveNote,
  };
}

function progressInfo(
  today: YMD,
  enlist: YMD,
  discharge: YMD,
  promotions: Promotion[],
  rankOn: (d: YMD) => Rank,
) {
  const total = diffDays(enlist, discharge) + 1;
  if (today < enlist) {
    return {
      phase: "before" as const,
      dDayEnlist: diffDays(today, enlist),
      dDayDischarge: diffDays(today, discharge),
      served: 0,
      total,
      percent: 0,
      rank: null,
      rankKo: null,
      next: null,
    };
  }
  if (today > discharge) {
    return {
      phase: "done" as const,
      dDayEnlist: 0,
      dDayDischarge: 0,
      served: total,
      total,
      percent: 100,
      rank: "sgt" as Rank,
      rankKo: "전역",
      next: null,
    };
  }
  const served = diffDays(enlist, today) + 1;
  const rank = rankOn(today);
  const nextPromo = promotions.find((x) => x.date > today) ?? null;
  return {
    phase: "serving" as const,
    dDayEnlist: 0,
    dDayDischarge: diffDays(today, discharge),
    served,
    total,
    percent: Math.min(100, Math.round((served / total) * 1000) / 10),
    rank,
    rankKo: RANK_KO[rank],
    next: nextPromo ? { ...nextPromo, dDay: diffDays(today, nextPromo.date) } : null,
  };
}
