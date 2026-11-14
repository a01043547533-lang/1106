import data from "@/data/centers.json";
import type { Branch, Source } from "@/rules/types";

export interface Item {
  name: string;
  /** 왜 필요한지, 주의할 점 */
  tip?: string;
  /** 사제로 사 가면 좋은 품목이면 true (제휴 링크 자리) */
  buy?: boolean;
  /** 제휴 링크. 비어 있으면 화면에 링크를 안 띄운다 */
  link?: string | null;
}

export interface Division {
  id: string;
  name: string;
  nick: string;
  place: string;
  command: string;
  mmaUrl: string;
  /** 확인된 최근 수료식 날짜와 출처 */
  cases: { date: string; url: string }[];
  family: string;
  note: string;
  /** 3=수, 0=요일 미확인 */
  graduationWeekday: number;
  warning: string;
}

export interface Center {
  id: string;
  name: string;
  short: string;
  branch: Branch | "all";
  kind: "nonsan" | "division" | "navy" | "airforce" | "marine" | "social";
  /** 입영한 주를 1주차로 셀 때 수료하는 주 */
  weeks: number;
  durationLabel: string;
  /** 1=월 … 5=금, 0=요일 미확인(주간으로만 안내) */
  graduationWeekday: number;
  graduationNote: string;
  family: string;
  letterNote: string;
  parcelNote: string;
  docs: Item[];
  required: Item[];
  recommended: Item[];
  /** 지급되니 사 갈 필요 없는 것 */
  skip: Item[];
  banned: Item[];
  phone: string;
  /** 사단 신교대만: 사단별 정보 */
  divisions?: Division[];
  sources: Source[];
  lastVerified: string;
}

interface CentersFile {
  updated: string;
  common: { docs: Item[]; banned: Item[]; note: string };
  centers: Center[];
}

const file = data as CentersFile;

export const CENTERS_UPDATED = file.updated;
export const COMMON = file.common;

export function listCenters(): Center[] {
  return file.centers;
}

export function getCenter(id: string): Center | null {
  return file.centers.find((c) => c.id === id) ?? null;
}

export function getDivision(centerId: string, divisionId: string | undefined | null): Division | null {
  if (!divisionId) return null;
  return getCenter(centerId)?.divisions?.find((d) => d.id === divisionId) ?? null;
}

export function defaultCenterFor(branch: Branch): string {
  switch (branch) {
    case "army":
      return "nonsan";
    case "navy":
      return "navy";
    case "airforce":
      return "airforce";
    case "marine":
      return "marine";
    case "social":
      return "social";
  }
}
