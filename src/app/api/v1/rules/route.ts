import type { NextRequest } from "next/server";
import { allRules, rulesFor } from "@/rules";
import { handle, ok, optInt, options } from "@/lib/api";

// GET /api/v1/rules?year=2026  그 해 봉급표·적금·복무기간 규정 원본
export function GET(req: NextRequest) {
  return handle(() => {
    const y = optInt(req.nextUrl.searchParams.get("year"), "year", 2020, 2035);
    if (!y) return ok({ years: allRules().map((r) => ({ year: r.year, status: r.status, basis: r.basis })) });
    const { rules, estimated } = rulesFor(y);
    return ok({ requestedYear: y, estimated, rules });
  });
}

export const OPTIONS = options;
