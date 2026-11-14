import r2026 from "./2026.json";
import r2027 from "./2027.json";
import type { RulesYear } from "./types";

// 새 연도 파일을 만들면 여기 한 줄만 추가한다.
const ALL: RulesYear[] = [r2026 as RulesYear, r2027 as RulesYear].sort((a, b) => a.year - b.year);

export const RULE_YEARS = ALL.map((r) => r.year);
export const LATEST_RULES = ALL[ALL.length - 1];
export const EARLIEST_RULES = ALL[0];

/**
 * 그 해 규정. 파일이 없는 해는 가장 가까운 해 규정을 쓰고 estimated=true로 알려 준다.
 */
export function rulesFor(year: number): { rules: RulesYear; estimated: boolean } {
  const exact = ALL.find((r) => r.year === year);
  if (exact) return { rules: exact, estimated: exact.status !== "confirmed" };
  if (year < EARLIEST_RULES.year) return { rules: EARLIEST_RULES, estimated: true };
  const before = [...ALL].reverse().find((r) => r.year <= year) ?? LATEST_RULES;
  return { rules: before, estimated: true };
}

export function allRules(): RulesYear[] {
  return ALL;
}
