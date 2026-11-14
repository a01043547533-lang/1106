import type { NextRequest } from "next/server";
import { handle, needDate, ok, options } from "@/lib/api";
import { todoFor, TODO_SOURCES, TODO_UPDATED } from "@/lib/todo";

// GET /api/v1/todo?enlist=2026-12-07  입대 전 행정 할 일 (D-day별)
export function GET(req: NextRequest) {
  return handle(() => {
    const enlist = needDate(req.nextUrl.searchParams.get("enlist"), "enlist");
    return ok({ enlist, updated: TODO_UPDATED, groups: todoFor(enlist), sources: TODO_SOURCES });
  });
}

export const OPTIONS = options;
