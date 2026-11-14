// 날짜는 전부 "YYYY-MM-DD" 문자열로 다룬다. 내부 계산은 UTC 자정 기준이라
// 서버(버셀, UTC)와 브라우저(KST) 어디서 돌려도 같은 날짜가 나온다.

export type YMD = string; // "2026-02-03"

const DAY_MS = 86_400_000;

export function isYMD(s: unknown): s is YMD {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = toDate(s);
  return fromDate(d) === s;
}

export function toDate(s: YMD): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function fromDate(d: Date): YMD {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ymd(y: number, m: number, d: number): YMD {
  return fromDate(new Date(Date.UTC(y, m - 1, d)));
}

export function addDays(s: YMD, n: number): YMD {
  return fromDate(new Date(toDate(s).getTime() + n * DAY_MS));
}

/** 달 더하기. 말일 넘침은 그 달 말일로 맞춘다(1/31 + 1개월 = 2/28). */
export function addMonths(s: YMD, n: number): YMD {
  const [y, m, d] = s.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = daysInMonth(ny, nm);
  return ymd(ny, nm, Math.min(d, last));
}

/** 그 달 1일에서 n개월 뒤의 1일 */
export function firstOfMonthPlus(s: YMD, n: number): YMD {
  const [y, m] = s.split("-").map(Number);
  return addMonths(ymd(y, m, 1), n);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function diffDays(a: YMD, b: YMD): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
}

/** 0=일 … 6=토 */
export function weekday(s: YMD): number {
  return toDate(s).getUTCDay();
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];
export function weekdayKo(s: YMD): string {
  return WD[weekday(s)];
}

export function year(s: YMD): number {
  return Number(s.slice(0, 4));
}
export function month(s: YMD): number {
  return Number(s.slice(5, 7));
}

/** "2026년 2월 3일 (화)" */
export function formatKo(s: YMD, withWeekday = true): string {
  const [y, m, d] = s.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일${withWeekday ? ` (${weekdayKo(s)})` : ""}`;
}

/** "2.3 (화)" */
export function formatShort(s: YMD): string {
  const [, m, d] = s.split("-").map(Number);
  return `${m}.${d} (${weekdayKo(s)})`;
}

/** 한국 시각 기준 오늘 */
export function todayKST(now: Date = new Date()): YMD {
  return fromDate(new Date(now.getTime() + 9 * 3_600_000));
}

export function maxYMD(a: YMD, b: YMD): YMD {
  return a > b ? a : b;
}
export function minYMD(a: YMD, b: YMD): YMD {
  return a < b ? a : b;
}

/**
 * 기간 끝날(민법 160조): 첫날을 넣어 n개월을 세면 마지막 달의 같은 날짜 전날에 끝난다.
 * 마지막 달에 같은 날짜가 없으면 그 달 말일에 끝난다. (3/31 + 18개월 → 이듬해 9/30)
 */
export function periodEnd(start: YMD, months: number): YMD {
  const [y, m, d] = start.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = daysInMonth(ny, nm);
  if (d > last) return ymd(ny, nm, last);
  return addDays(ymd(ny, nm, d), -1);
}
