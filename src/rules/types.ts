// 연도별 규정 파일(rules/2026.json 등)의 모양.
// 매년 1월에 새 연도 파일을 하나 복사해 숫자만 바꾸면 된다.

export type Branch = "army" | "marine" | "navy" | "airforce" | "social";
export type Rank = "pvt" | "pfc" | "cpl" | "sgt"; // 이병 일병 상병 병장

export interface Source {
  label: string;
  url: string;
}

export interface BranchRule {
  name: string; // "육군"
  serviceMonths: number;
  /** 각 계급에 머무는 최저 개월 수(입대한 달을 1개월로 센다). 병장은 전역까지라 없음 */
  promotionMonths: { pvt: number; pfc: number; cpl: number };
  annualLeaveDays: number; // 연가 총일수(복무기간 전체)
  leaveNote: string;
}

export interface RulesYear {
  year: number;
  /** 응답에 그대로 붙는 기준 문구 */
  basis: string;
  status: "confirmed" | "proposed"; // 확정 / 정부안
  pay: Record<Rank, number>; // 월 봉급(원)
  savings: {
    monthlyCapPerPerson: number; // 1인 월 납입 한도(합산)
    monthlyCapPerBank: number;
    matchingRate: number; // 1 = 납입액의 100%
    matchingMonthlyCap: number; // 월 매칭 상한
    baseRate: number; // 기본금리(연, 0.05 = 5%)
    bonusRate: number; // 정부 이자지원(연, 0.01 = 1%p)
    socialEligible: boolean; // 사회복무요원 가입·매칭 가능
    note: string;
  };
  social: {
    mealPerDay: number; // 중식비(일)
    transportPerDay: number; // 교통비(일)
    workDaysPerMonth: number; // 계산용 평균 출근일
    note: string;
  };
  branches: Record<Branch, BranchRule>;
  dischargeAdjust: {
    /** 전역일이 휴일이면 앞당기는 규정을 적용할지 */
    enabled: boolean;
    note: string;
  };
  reserve: {
    totalYears: number;
    note: string;
  };
  sources: Source[];
}

export const RANK_KO: Record<Rank, string> = {
  pvt: "이병",
  pfc: "일병",
  cpl: "상병",
  sgt: "병장",
};

export const BRANCHES: Branch[] = ["army", "marine", "navy", "airforce", "social"];
