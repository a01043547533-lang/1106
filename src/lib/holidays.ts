import data from "@/rules/holidays.json";
import { type YMD, weekday, addDays } from "./date";

type HolidayFile = { updated: string; source: string; years: Record<string, Record<YMD, string>> };
const file = data as HolidayFile;

const MAP: Record<YMD, string> = Object.assign({}, ...Object.values(file.years));

export const HOLIDAY_YEARS = Object.keys(file.years).map(Number).sort();
export const HOLIDAY_SOURCE = file.source;

export function holidaysOf(year: number): { date: YMD; name: string }[] {
  const y = file.years[String(year)];
  if (!y) return [];
  return Object.entries(y)
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function holidayName(d: YMD): string | null {
  return MAP[d] ?? null;
}

export function isCovered(d: YMD): boolean {
  return HOLIDAY_YEARS.includes(Number(d.slice(0, 4)));
}

/** 토·일·공휴일이면 쉬는 날 */
export function isOffDay(d: YMD): boolean {
  const w = weekday(d);
  return w === 0 || w === 6 || d in MAP;
}

/** 쉬는 날이면 바로 앞 평일로 */
export function previousWorkday(d: YMD): YMD {
  let cur = d;
  for (let i = 0; i < 15 && isOffDay(cur); i++) cur = addDays(cur, -1);
  return cur;
}
