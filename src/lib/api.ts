import { isYMD, type YMD } from "./date";
import { BRANCHES, type Branch } from "@/rules/types";
import { SITE } from "./site";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function ok(data: unknown, init?: { cacheSeconds?: number }) {
  const cache = init?.cacheSeconds ?? 3600;
  return Response.json(
    { ok: true, data, notice: SITE.disclaimer },
    {
      headers: {
        ...CORS,
        "Cache-Control": `public, s-maxage=${cache}, stale-while-revalidate=86400`,
      },
    },
  );
}

export function fail(status: number, code: string, message: string) {
  return Response.json({ ok: false, error: { code, message } }, { status, headers: CORS });
}

export function options() {
  return new Response(null, { status: 204, headers: CORS });
}

export class BadInput extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function needDate(v: string | null | undefined, name: string): YMD {
  if (!v) throw new BadInput("missing_param", `${name} 값이 필요해요. 예: ${name}=2026-02-03`);
  if (!isYMD(v)) throw new BadInput("invalid_date", `${name}는 YYYY-MM-DD 형식이어야 해요. 받은 값: ${v}`);
  if (v < "2020-01-01" || v > "2035-12-31")
    throw new BadInput("out_of_range", `${name}는 2020-01-01 ~ 2035-12-31 사이만 계산해요.`);
  return v;
}

export function optDate(v: string | null | undefined, name: string): YMD | undefined {
  return v ? needDate(v, name) : undefined;
}

const BRANCH_ALIAS: Record<string, Branch> = {
  army: "army",
  육군: "army",
  marine: "marine",
  해병: "marine",
  해병대: "marine",
  navy: "navy",
  해군: "navy",
  airforce: "airforce",
  "air-force": "airforce",
  공군: "airforce",
  social: "social",
  사회복무: "social",
  사회복무요원: "social",
};

export function parseBranch(v: string | null | undefined): Branch {
  if (!v) return "army";
  const b = BRANCH_ALIAS[v.trim().toLowerCase()] ?? BRANCH_ALIAS[v.trim()];
  if (!b || !BRANCHES.includes(b))
    throw new BadInput("invalid_branch", `branch는 ${BRANCHES.join(", ")} 중 하나예요. 받은 값: ${v}`);
  return b;
}

export function optInt(v: string | null | undefined, name: string, min: number, max: number): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new BadInput("invalid_number", `${name}는 ${min}~${max} 사이 숫자여야 해요. 받은 값: ${v}`);
  return Math.floor(n);
}

export function handle(fn: () => Response | Promise<Response>) {
  return Promise.resolve()
    .then(fn)
    .catch((e: unknown) => {
      if (e instanceof BadInput) return fail(400, e.code, e.message);
      // Next.js 내부 신호(빌드 때 미리 그리기 중단 등)는 그대로 넘긴다
      if (e && typeof e === "object" && "digest" in e) throw e;
      console.error(e);
      return fail(500, "internal", "계산 중 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.");
    });
}
