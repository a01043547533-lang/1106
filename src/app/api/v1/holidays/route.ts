import type { NextRequest } from "next/server";
import { holidaysOf, HOLIDAY_YEARS, HOLIDAY_SOURCE } from "@/lib/holidays";
import { handle, ok, optInt, options } from "@/lib/api";

// GET /api/v1/holidays?year=2027  법정공휴일(대체공휴일 포함)
export function GET(req: NextRequest) {
  return handle(() => {
    const y = optInt(req.nextUrl.searchParams.get("year"), "year", 2020, 2035);
    if (!y) return ok({ years: HOLIDAY_YEARS, source: HOLIDAY_SOURCE });
    return ok({ year: y, covered: HOLIDAY_YEARS.includes(y), holidays: holidaysOf(y), source: HOLIDAY_SOURCE });
  });
}

export const OPTIONS = options;
